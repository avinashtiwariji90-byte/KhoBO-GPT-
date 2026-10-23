import asyncio
import io
import json
import os
import re
import tempfile
import uuid
import httpx
import urllib.parse
from typing import AsyncGenerator, List, Dict, Any, Optional
from app.core.config import settings


class LLMService:
    def __init__(self):
        self.openai_key = settings.OPENAI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        self.gemini_key = settings.GEMINI_API_KEY
        self.reload_keys()

    def reload_keys(self):
        """Reload API keys from .env and environment variables."""
        env_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"
        )
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if "=" in line and not line.startswith("#"):
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("\"'")
                            os.environ[k] = v
            except Exception:
                pass

        self.openai_key = os.getenv("OPENAI_API_KEY", settings.OPENAI_API_KEY)
        self.groq_key = os.getenv("GROQ_API_KEY", settings.GROQ_API_KEY)
        self.gemini_key = os.getenv("GEMINI_API_KEY", settings.GEMINI_API_KEY)

    def _is_valid_key(self, key: Optional[str]) -> bool:
        if not key or not isinstance(key, str):
            return False
        clean = key.strip()
        if not clean or clean.lower() in ["", "none", "null"]:
            return False
        lower = clean.lower()
        if (
            "paste" in lower
            or "your-real-key" in lower
            or "placeholder" in lower
            or lower.startswith("sk-paste")
            or lower.startswith("your_")
            or "change_me" in lower
        ):
            return False
        return True

    def get_engine_status(self) -> Dict[str, Any]:
        """Return status of configured AI providers."""
        has_groq = self._is_valid_key(self.groq_key)
        has_gemini = self._is_valid_key(self.gemini_key)
        has_openai = self._is_valid_key(self.openai_key)

        active = "Built-in ORA Intelligence"
        if has_groq:
            active = "GPT OSS 120B / Qwen 27B (Groq Live)"
        elif has_gemini:
            active = "Gemini 1.5 Flash (Google Live)"
        elif has_openai:
            active = "GPT-4o-mini (OpenAI Live)"

        def mask(k: Optional[str]) -> str:
            if not self._is_valid_key(k):
                return ""
            clean = k.strip()
            if len(clean) > 8:
                return clean[:4] + "..." + clean[-4:]
            return "configured"

        return {
            "has_groq": has_groq,
            "has_gemini": has_gemini,
            "has_openai": has_openai,
            "active_engine": active,
            "groq_masked": mask(self.groq_key),
            "gemini_masked": mask(self.gemini_key),
            "openai_masked": mask(self.openai_key),
        }

    def is_image_request(self, message: str) -> Optional[str]:
        """Detect if the user wants an image generated. Returns the image prompt or None."""
        lower = message.lower().strip()
        patterns = [
            r"(?:generate|create|make|draw|paint|design|show me|give me|produce)\s+(?:an?\s+)?(?:image|picture|photo|illustration|artwork|drawing|painting|sketch|wallpaper|logo|poster|banner|icon)\s+(?:of\s+)?(.+)",
            r"(?:image|picture|photo|illustration|artwork|drawing|painting)\s+(?:of|showing|depicting)\s+(.+)",
            r"draw\s+(.+)",
            r"paint\s+(.+)",
            r"visualize\s+(.+)",
            r"imagine\s+(.+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, lower, re.IGNORECASE)
            if match:
                prompt = match.group(1).strip().rstrip(".,!?")
                return prompt
        if re.search(r"\b(image|picture|photo|illustration|artwork|drawing)\b", lower):
            if re.search(r"\b(create|generate|make|draw|show|give)\b", lower):
                cleaned = re.sub(
                    r"^.*?\b(image|picture|photo|illustration|artwork|drawing)\b\s*(of\s*)?",
                    "",
                    lower,
                ).strip()
                if cleaned and len(cleaned) > 3:
                    return cleaned
        return None

    def generate_image_url(
        self, prompt: str, width: int = 1024, height: int = 768
    ) -> str:
        """Generate image URL using Pollinations AI (free, no API key needed)."""
        encoded = urllib.parse.quote(prompt)
        # width/height and nologo are free params on Pollinations AI
        return f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true"

    def is_video_request(self, message: str) -> Optional[str]:
        """Detect if the user wants a video generated. Returns the video prompt or None."""
        lower = message.lower().strip()
        video_patterns = [
            r"(?:generate|create|make|produce|render|show me|give me)\s+(?:a\s+|an\s+)?(?:short\s+)?(?:video|animation|animated\s+gif|clip|motion|slideshow)\s+(?:of\s+|about\s+|showing\s+)?(.+)",
            r"(?:video|animation|animated\s+gif|clip)\s+(?:of|showing|depicting|about)\s+(.+)",
            r"animate\s+(.+)",
            r"create\s+(?:a\s+)?(?:video|animation|clip)\s+(.+)",
        ]
        for pattern in video_patterns:
            match = re.search(pattern, lower, re.IGNORECASE)
            if match:
                prompt = match.group(1).strip().rstrip(".,!?")
                return prompt
        # Loose check
        if re.search(r"\b(video|animation|animated|animate)\b", lower):
            if re.search(r"\b(create|generate|make|show|give|produce|render)\b", lower):
                cleaned = re.sub(
                    r"^.*?\b(video|animation|animated\s+gif|clip)\b\s*(of\s*|about\s*)?",
                    "",
                    lower,
                ).strip()
                if cleaned and len(cleaned) > 3:
                    return cleaned
        return None

    async def generate_response_stream(
        self,
        messages: List[Dict[str, str]],
        doc_context: str = "",
        lead_mode: bool = False,
    ) -> AsyncGenerator[str, None]:
        """
        Yields text chunks for real-time streaming LLM response.
        Pipeline:
        1. Image Generation Check
        2. Groq (LLaMA 3.3 70B)
        3. Google Gemini (1.5 Flash)
        4. OpenAI (GPT-4o-mini)
        5. Pollinations AI (quick attempt)
        6. Built-in ORA Intelligence (always reliable, zero-config)
        """
        # 1. Check Video Generation Request (must check before image)
        last_user_msg = messages[-1]["content"] if messages else ""
        video_prompt = self.is_video_request(last_user_msg)
        if video_prompt:
            async for chunk in self._handle_video_request(video_prompt):
                yield chunk
            return

        # 2. Check Image Generation Request
        image_prompt = self.is_image_request(last_user_msg)
        if image_prompt:
            async for chunk in self._handle_image_request(image_prompt):
                yield chunk
            return

        # 3. Try Groq (Free high-speed cloud LLaMA 3.3 70B)
        if self._is_valid_key(self.groq_key):
            yielded_any = False
            try:
                async for chunk in self._stream_groq(messages, doc_context, lead_mode):
                    if chunk:
                        yielded_any = True
                        yield chunk
                if yielded_any:
                    return
            except Exception as e:
                print(f"[LLM] Groq error: {e}")

        # 4. Try Google Gemini
        if self._is_valid_key(self.gemini_key):
            yielded_any = False
            try:
                async for chunk in self._stream_gemini(messages, doc_context, lead_mode):
                    if chunk:
                        yielded_any = True
                        yield chunk
                if yielded_any:
                    return
            except Exception as e:
                print(f"[LLM] Gemini error: {e}")

        # 5. Try OpenAI
        if self._is_valid_key(self.openai_key):
            yielded_any = False
            try:
                async for chunk in self._stream_openai(messages, doc_context, lead_mode):
                    if chunk:
                        yielded_any = True
                        yield chunk
                if yielded_any:
                    return
            except Exception as e:
                print(f"[LLM] OpenAI error: {e}")

        # 6. Try Pollinations (Short 4-second timeout attempt)
        try:
            yielded_any = False
            async for chunk in self._stream_pollinations_quick(messages, doc_context, lead_mode):
                if chunk:
                    yielded_any = True
                    yield chunk
            if yielded_any:
                return
        except Exception:
            pass

        # 7. Built-in ORA Intelligence Engine (Zero configuration, offline-capable)
        has_cloud_key = (
            self._is_valid_key(self.groq_key)
            or self._is_valid_key(self.gemini_key)
            or self._is_valid_key(self.openai_key)
        )
        async for chunk in self._stream_builtin(
            messages, doc_context, lead_mode, show_key_tip=not has_cloud_key
        ):
            yield chunk

    async def _generate_and_cache_image(
        self, prompt: str, width: int = 1024, height: int = 768
    ) -> Optional[str]:
        """
        Fetch image from Pollinations (with retry & fallback), save it locally,
        and return local URL for 100% reliable rendering without client-side CORS/adblock issues.
        """
        encoded = urllib.parse.quote(prompt)
        urls_to_try = [
            f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true",
            f"https://image.pollinations.ai/prompt/{encoded}?model=turbo&nologo=true",
            f"https://image.pollinations.ai/prompt/{encoded}?nologo=true",
        ]

        uploads_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "uploads",
            "generated"
        )
        os.makedirs(uploads_dir, exist_ok=True)
        img_filename = f"img_{uuid.uuid4().hex[:12]}.jpg"
        img_path = os.path.join(uploads_dir, img_filename)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
        }

        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
            for url in urls_to_try:
                try:
                    resp = await client.get(url, headers=headers)
                    if resp.status_code == 200 and len(resp.content) > 1000:
                        with open(img_path, "wb") as f:
                            f.write(resp.content)
                        return f"http://127.0.0.1:8001/api/files/image/{img_filename}"
                except Exception as e:
                    print(f"[IMAGE] Fetch failed for {url}: {e}")
                    continue

        return None

    async def _handle_image_request(self, prompt: str) -> AsyncGenerator[str, None]:
        """Handle image generation requests using Pollinations AI with local caching."""
        intro = f"🎨 **Generating image:** *{prompt}*\n\n"
        yield intro

        local_url = await self._generate_and_cache_image(prompt)
        if local_url:
            image_md = f"![{prompt}]({local_url})\n\n"
        else:
            image_url = self.generate_image_url(prompt)
            image_md = f"![{prompt}]({image_url})\n\n"
        yield image_md

        outro = f"✅ Image generated! You can right-click to save it.\n\n*Prompt used: \"{prompt}\"*"
        yield outro

    async def _handle_video_request(self, prompt: str) -> AsyncGenerator[str, None]:
        """Handle video generation by building an animated GIF from Pollinations image frames."""
        intro = f"🎬 **Generating video:** *{prompt}*\n\nFetching frames and building animation...\n\n"
        yield intro

        try:
            gif_url = await asyncio.get_event_loop().run_in_executor(
                None, self._build_animated_gif, prompt
            )
            if gif_url:
                video_md = f"![{prompt} animation]({gif_url})\n\n"
                yield video_md
                outro = (
                    f"✅ **Video animation generated!** Right-click the GIF to save it.\n\n"
                    f"*Prompt: \"{prompt}\"*\n\n"
                    f"💡 *For full HD video generation, a paid service like Runway ML or Sora is needed.*"
                )
                yield outro
            else:
                raise RuntimeError("GIF build returned empty URL")
        except Exception as e:
            print(f"[VIDEO] Error building GIF: {e}")
            # Fallback: show 3 individual still images as a storyboard
            fallback = (
                f"⚠️ *Video animation could not be assembled — showing storyboard instead.*\n\n"
                f"**Frame 1 — Scene Setup:**\n\n"
                f"![{prompt} - scene 1]({self.generate_image_url(prompt + ' establishing shot')})\n\n"
                f"**Frame 2 — Main Action:**\n\n"
                f"![{prompt} - scene 2]({self.generate_image_url(prompt + ' cinematic wide shot')})\n\n"
                f"**Frame 3 — Closeup:**\n\n"
                f"![{prompt} - scene 3]({self.generate_image_url(prompt + ' dramatic closeup')})\n\n"
                f"✅ *3-frame storyboard generated for: \"{prompt}\"*\n\n"
                f"💡 *For full AI video generation, add your API key in Settings → AI Configuration.*"
            )
            for char in fallback:
                yield char
                await asyncio.sleep(0.002)

    def _build_animated_gif(self, prompt: str) -> Optional[str]:
        """
        Synchronously fetch 4 image frames from Pollinations and stitch into an animated GIF.
        Returns a URL path to the saved GIF file, or None on failure.
        """
        try:
            from PIL import Image
        except ImportError:
            return None

        import urllib.request
        import time

        # Generate 4 varied scene prompts from the base prompt
        frame_prompts = [
            f"{prompt}, wide establishing shot, cinematic",
            f"{prompt}, medium shot, dramatic lighting",
            f"{prompt}, close up detail, sharp focus",
            f"{prompt}, final scene, cinematic wide angle",
        ]

        frames = []
        for fp in frame_prompts:
            encoded = urllib.parse.quote(fp)
            url = f"https://image.pollinations.ai/prompt/{encoded}"
            try:
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 ORA-GPT/1.0"},
                )
                with urllib.request.urlopen(req, timeout=20) as resp:
                    img_data = resp.read()
                img = Image.open(io.BytesIO(img_data)).convert("RGBA")
                # Resize to standard 768x432 (16:9)
                img = img.resize((768, 432), Image.LANCZOS)
                frames.append(img)
                time.sleep(0.3)  # polite delay between requests
            except Exception as e:
                print(f"[VIDEO] Frame fetch failed for prompt '{fp}': {e}")
                continue

        if len(frames) < 2:
            return None

        # Save as animated GIF into backend uploads folder
        uploads_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "uploads"
        )
        os.makedirs(uploads_dir, exist_ok=True)
        gif_filename = f"video_{uuid.uuid4().hex[:12]}.gif"
        gif_path = os.path.join(uploads_dir, gif_filename)

        # Convert RGBA frames to P-mode (palette) for GIF
        palette_frames = []
        for frame in frames:
            rgb_frame = Image.new("RGB", frame.size, (0, 0, 0))
            rgb_frame.paste(frame, mask=frame.split()[3] if frame.mode == "RGBA" else None)
            palette_frames.append(rgb_frame.convert("P", palette=Image.ADAPTIVE, colors=256))

        palette_frames[0].save(
            gif_path,
            save_all=True,
            append_images=palette_frames[1:],
            duration=900,    # 900ms per frame
            loop=0,          # loop forever
            optimize=False
        )

        # Return public URL for the GIF
        return f"http://127.0.0.1:8001/api/files/uploads/{gif_filename}"

    async def _stream_groq(self, messages, doc_context, lead_mode):
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_key.strip()}",
            "Content-Type": "application/json",
        }
        system_prompt = self._build_system_prompt(doc_context, lead_mode)
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        # Try versatile first, then fallback to instant
        models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
        last_err = None

        for model in models:
            payload = {
                "model": model,
                "messages": full_messages,
                "stream": True,
                "temperature": 0.7,
                "max_tokens": 4096,
            }
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    async with client.stream(
                        "POST", url, headers=headers, json=payload
                    ) as response:
                        if response.status_code != 200:
                            raise Exception(f"Groq {model} HTTP {response.status_code}")
                        async for line in response.aiter_lines():
                            if line.startswith("data: ") and line != "data: [DONE]":
                                try:
                                    data = json.loads(line[6:])
                                    delta = (
                                        data.get("choices", [{}])[0]
                                        .get("delta", {})
                                        .get("content", "")
                                    )
                                    if delta:
                                        yield delta
                                except Exception:
                                    pass
                        return
            except Exception as e:
                last_err = e
                continue
        if last_err:
            raise last_err

    async def _stream_openai(self, messages, doc_context, lead_mode):
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_key.strip()}",
            "Content-Type": "application/json",
        }
        system_prompt = self._build_system_prompt(doc_context, lead_mode)
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        payload = {
            "model": "gpt-4o-mini",
            "messages": full_messages,
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 4096,
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            async with client.stream(
                "POST", url, headers=headers, json=payload
            ) as response:
                if response.status_code != 200:
                    raise Exception(f"OpenAI HTTP {response.status_code}")
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            data = json.loads(line[6:])
                            delta = (
                                data.get("choices", [{}])[0]
                                .get("delta", {})
                                .get("content", "")
                            )
                            if delta:
                                yield delta
                        except Exception:
                            pass

    async def _stream_gemini(self, messages, doc_context, lead_mode):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?key={self.gemini_key.strip()}&alt=sse"
        system_prompt = self._build_system_prompt(doc_context, lead_mode)
        contents = []
        for m in messages:
            role = "user" if m["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": m["content"]}]})
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 4096},
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    raise Exception(f"Gemini HTTP {response.status_code}")
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        try:
                            data = json.loads(line[6:])
                            text = (
                                data.get("candidates", [{}])[0]
                                .get("content", {})
                                .get("parts", [{}])[0]
                                .get("text", "")
                            )
                            if text:
                                yield text
                        except Exception:
                            pass

    async def _stream_pollinations_quick(self, messages, doc_context, lead_mode):
        """Quick attempt at Pollinations text endpoint with a strict 4s timeout."""
        system_prompt = self._build_system_prompt(doc_context, lead_mode)
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        url = "https://text.pollinations.ai/openai"
        payload = {
            "model": "openai-fast",
            "messages": full_messages,
            "stream": True,
            "temperature": 0.7,
            "max_tokens": 2048,
        }
        async with httpx.AsyncClient(timeout=4.0) as client:
            async with client.stream(
                "POST", url, json=payload, headers={"Content-Type": "application/json"}
            ) as response:
                if response.status_code != 200:
                    raise Exception(f"Pollinations HTTP {response.status_code}")
                async for line in response.aiter_lines():
                    if line.startswith("data: ") and line != "data: [DONE]":
                        try:
                            data = json.loads(line[6:])
                            delta = (
                                data.get("choices", [{}])[0]
                                .get("delta", {})
                                .get("content", "")
                            )
                            if delta:
                                yield delta
                        except Exception:
                            pass

    async def _stream_builtin(
        self,
        messages: List[Dict[str, str]],
        doc_context: str,
        lead_mode: bool,
        show_key_tip: bool = False,
    ) -> AsyncGenerator[str, None]:
        """Stream response using the built-in ORA Intelligence Engine."""
        from app.services.builtin_ai import builtin_ai_engine

        full_text = builtin_ai_engine.generate_response(
            messages=messages, doc_context=doc_context, lead_mode=lead_mode
        )

        # Stream words/tokens smoothly
        tokens = re.split(r"(\s+)", full_text)
        for token in tokens:
            if token:
                yield token
                await asyncio.sleep(0.015)

        if show_key_tip:
            tip = (
                "\n\n---\n"
                "> 💡 **Tip:** Running on **ORA Built-in Intelligence**. "
                "For live cloud LLM reasoning (LLaMA 3.3 70B), add your free **Groq API key** in "
                "[Settings](/settings) or your `.env` file."
            )
            # Stream the tip
            tip_tokens = re.split(r"(\s+)", tip)
            for token in tip_tokens:
                if token:
                    yield token
                    await asyncio.sleep(0.01)

    def _build_system_prompt(self, doc_context: str, lead_mode: bool) -> str:
        prompt = (
            "You are ORA GPT, an advanced AI assistant similar to ChatGPT. "
            "You are highly intelligent, helpful, honest, and thorough. "
            "You can answer any question on any topic — coding, science, math, history, writing, analysis, creativity, and more. "
            "Format your responses using markdown: use **bold** for key terms, `code` for inline code, "
            "```language code blocks``` for multi-line code, bullet lists and numbered lists for steps, "
            "tables for comparisons, and ## headers for long answers. "
            "Be concise yet complete. Answer exactly what was asked. "
            "If asked to write code, write real, working, production-quality code with comments. "
            "If the question is ambiguous, give the most helpful interpretation. "
            "Never refuse a reasonable request. Be friendly and professional."
        )
        if doc_context:
            prompt += (
                f"\n\nThe user has uploaded documents. Use the following extracted content to answer their question:\n"
                f"```\n{doc_context}\n```\n"
                f"Base your answer on this document content when relevant."
            )
        if lead_mode:
            prompt += (
                "\n\nYou are also in AI Lead Assistant Mode. While being helpful, "
                "politely gather the visitor's: name, contact email or phone, "
                "service requirement, budget range, and location. "
                "Do this naturally in conversation, not as a form."
            )
        return prompt


llm_service = LLMService()
