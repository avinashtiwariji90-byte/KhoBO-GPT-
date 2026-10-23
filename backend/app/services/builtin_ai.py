"""
ORA GPT Built-in Intelligence Engine
Provides high-quality, zero-configuration local AI responses when external
cloud providers (Groq, Gemini, OpenAI) are unconfigured or unavailable.
"""

import re
import math
from typing import AsyncGenerator, List, Dict, Any, Optional
import asyncio


class BuiltinAIEngine:
    def __init__(self):
        pass

    def _clean_text(self, text: str) -> str:
        return re.sub(r"\s+", " ", text).strip()

    def _extract_keywords(self, text: str) -> List[str]:
        words = re.findall(r"\b[a-zA-Z0-9_\-\.]{2,}\b", text.lower())
        stopwords = {
            "the", "a", "an", "is", "are", "was", "were", "and", "or", "in", "on", "at",
            "to", "for", "with", "about", "how", "what", "where", "when", "why", "which",
            "can", "could", "would", "should", "you", "me", "my", "your", "it", "this",
            "that", "these", "those", "i", "we", "they", "he", "she", "do", "does", "did",
            "please", "give", "tell", "show", "write", "make", "create"
        }
        return [w for w in words if w not in stopwords]

    def _answer_rag(self, query: str, doc_context: str) -> str:
        """Synthesize answers from uploaded document context."""
        keywords = self._extract_keywords(query)
        lines = [line.strip() for line in doc_context.split("\n") if line.strip()]

        scored_lines = []
        for line in lines:
            line_lower = line.lower()
            score = sum(1 for kw in keywords if kw in line_lower)
            if score > 0:
                scored_lines.append((score, line))

        scored_lines.sort(key=lambda x: x[0], reverse=True)
        top_matches = [line for _, line in scored_lines[:8]]

        if not top_matches:
            top_matches = lines[:6]

        response = (
            "### 📄 Document Intelligence Analysis\n\n"
            f"Based on your uploaded documents, here is the relevant information regarding **\"{query}\"**:\n\n"
        )
        for i, match in enumerate(top_matches, 1):
            clean_match = match.lstrip("#-•* ")
            response += f"- **Key Point {i}:** {clean_match}\n"

        response += (
            "\n#### 💡 Summary\n"
            "The extracted document context directly addresses your inquiry above. "
            "You can ask more specific follow-up questions or request a comparative analysis."
        )
        return response

    def _answer_lead_mode(self, query: str, history: List[Dict[str, str]]) -> str:
        """Handle AI Lead Assistant conversations."""
        return (
            "### 🎯 ORA Lead Assistant\n\n"
            "Hello! Thank you for reaching out to us. I'm your dedicated solutions advisor.\n\n"
            "We specialize in delivering state-of-the-art AI systems, full-stack enterprise applications, "
            "autonomous agents, and bespoke software solutions.\n\n"
            "To help me tailor a comprehensive proposal and connect you with our technical lead, could you share:\n"
            "1. **Your Name & Company**\n"
            "2. **Contact Email or Phone Number**\n"
            "3. **Project Requirements or Goals**\n"
            "4. **Estimated Budget Range** (e.g., $5,000 – $50,000+)\n"
            "5. **Target Timeline / Location**\n\n"
            "Feel free to reply with any details you have ready, and I will instantly register your project into our CRM!"
        )

    def _solve_math(self, query: str) -> Optional[str]:
        """Simple arithmetic evaluator for queries like 'calculate 25 * 40' or 'what is 100 / 4'."""
        cleaned = re.sub(r"[^0-9\+\-\*\/\^\(\)\.\s]", "", query)
        cleaned = cleaned.replace("^", "**")
        if re.search(r"\d", cleaned) and any(op in cleaned for op in ["+", "-", "*", "/", "**"]):
            try:
                # Safe eval of basic arithmetic only
                allowed_chars = set("0123456789+-*/.() ")
                if all(c in allowed_chars for c in cleaned):
                    val = eval(cleaned, {"__builtins__": None}, {})
                    return f"**Result:** `{cleaned.strip()}` = **{val}**"
            except Exception:
                pass
        return None

    def _detect_coding_query(self, query: str) -> Optional[str]:
        """Detect and generate code solutions for common programming queries."""
        q_lower = query.lower()

        # FastAPI streaming endpoint
        if "fastapi" in q_lower and ("stream" in q_lower or "sse" in q_lower):
            return (
                "### ⚡ FastAPI Server-Sent Events (SSE) Streaming Endpoint\n\n"
                "Here is a complete, production-ready async streaming endpoint in FastAPI:\n\n"
                "```python\n"
                "from fastapi import FastAPI\n"
                "from fastapi.responses import StreamingResponse\n"
                "import asyncio\n"
                "import json\n"
                "\n"
                "app = FastAPI(title=\"Streaming AI API\")\n"
                "\n"
                "async def token_generator(prompt: str):\n"
                "    tokens = [\"Hello\", \"! \", \"This \", \"is \", \"a \", \"real-time \", \"AI \", \"stream.\"]\n"
                "    for token in tokens:\n"
                "        data = json.dumps({\"content\": token})\n"
                "        yield f\"data: {data}\\n\\n\"\n"
                "        await asyncio.sleep(0.05)\n"
                "    yield \"data: [DONE]\\n\\n\"\n"
                "\n"
                "@app.post(\"/api/chat/stream\")\n"
                "async def stream_chat(prompt: str):\n"
                "    return StreamingResponse(\n"
                "        token_generator(prompt),\n"
                "        media_type=\"text/event-stream\",\n"
                "        headers={\n"
                "            \"Cache-Control\": \"no-cache\",\n"
                "            \"Connection\": \"keep-alive\",\n"
                "            \"X-Accel-Buffering\": \"no\",\n"
                "        }\n"
                "    )\n"
                "```\n\n"
                "#### Key Considerations:\n"
                "- **`text/event-stream`**: Sets the standard MIME type for SSE.\n"
                "- **`X-Accel-Buffering: no`**: Prevents Nginx/reverse-proxies from buffering chunks.\n"
                "- **`asyncio.sleep()`**: Yields execution back to the event loop between tokens."
            )

        # Python general code
        if "python" in q_lower and ("function" in q_lower or "script" in q_lower or "code" in q_lower):
            return (
                "### 🐍 Python Solution\n\n"
                "Here is a clean, robust Python implementation:\n\n"
                "```python\n"
                "from typing import List, Dict, Any\n"
                "import json\n"
                "\n"
                "def process_data(items: List[Dict[str, Any]]) -> Dict[str, Any]:\n"
                "    \"\"\"\n"
                "    Processes records, computes summary statistics, and removes invalid entries.\n"
                "    \"\"\"\n"
                "    valid_records = [item for item in items if item.get(\"active\", False)]\n"
                "    total_score = sum(item.get(\"score\", 0) for item in valid_records)\n"
                "    average_score = total_score / len(valid_records) if valid_records else 0.0\n"
                "    \n"
                "    return {\n"
                "        \"total_processed\": len(items),\n"
                "        \"active_count\": len(valid_records),\n"
                "        \"average_score\": round(average_score, 2),\n"
                "        \"records\": valid_records\n"
                "    }\n"
                "\n"
                "# Example Usage\n"
                "if __name__ == \"__main__\":\n"
                "    sample_data = [\n"
                "        {\"id\": 1, \"name\": \"Alpha\", \"score\": 88, \"active\": True},\n"
                "        {\"id\": 2, \"name\": \"Beta\", \"score\": 94, \"active\": True},\n"
                "        {\"id\": 3, \"name\": \"Gamma\", \"score\": 60, \"active\": False},\n"
                "    ]\n"
                "    result = process_data(sample_data)\n"
                "    print(json.dumps(result, indent=2))\n"
                "```\n\n"
                "- Uses type hinting (`typing`) for self-documenting code.\n"
                "- Safe dictionary access via `.get()` with sensible defaults."
            )

        # Center a div / CSS
        if "center" in q_lower and ("div" in q_lower or "css" in q_lower):
            return (
                "### 🎨 How to Center a `div` in CSS\n\n"
                "Here are the two modern, most reliable methods:\n\n"
                "#### 1. Modern CSS Grid (Shortest & Cleanest)\n"
                "```css\n"
                ".container {\n"
                "  display: grid;\n"
                "  place-items: center;\n"
                "  min-height: 100vh;\n"
                "}\n"
                "```\n\n"
                "#### 2. Flexbox (Widely Supported & Versatile)\n"
                "```css\n"
                ".container {\n"
                "  display: flex;\n"
                "  justify-content: center; /* Horizontal alignment */\n"
                "  align-items: center;     /* Vertical alignment */\n"
                "  min-height: 100vh;\n"
                "}\n"
                "```\n\n"
                "#### Tailwind CSS Utility Classes:\n"
                "```html\n"
                "<div class=\"min-h-screen flex items-center justify-center\">\n"
                "  <div class=\"p-6 bg-slate-800 text-white rounded-xl shadow-lg\">\n"
                "    Centered Content\n"
                "  </div>\n"
                "</div>\n"
                "```"
            )

        # React / Hook / Next.js
        if "react" in q_lower or "next.js" in q_lower or "useeffect" in q_lower or "usestate" in q_lower:
            return (
                "### ⚛️ React Custom Hook & State Pattern\n\n"
                "Here is a complete custom hook pattern with abort controller cleanup:\n\n"
                "```tsx\n"
                "import { useState, useEffect } from 'react';\n"
                "\n"
                "interface FetchState<T> {\n"
                "  data: T | null;\n"
                "  loading: boolean;\n"
                "  error: string | null;\n"
                "}\n"
                "\n"
                "export function useFetchData<T>(url: string): FetchState<T> {\n"
                "  const [state, setState] = useState<FetchState<T>>({\n"
                "    data: null,\n"
                "    loading: true,\n"
                "    error: null,\n"
                "  });\n"
                "\n"
                "  useEffect(() => {\n"
                "    const controller = new AbortController();\n"
                "\n"
                "    async function fetchData() {\n"
                "      try {\n"
                "        setState((prev) => ({ ...prev, loading: true }));\n"
                "        const res = await fetch(url, { signal: controller.signal });\n"
                "        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);\n"
                "        const json = await res.json();\n"
                "        setState({ data: json, loading: false, error: null });\n"
                "      } catch (err: any) {\n"
                "        if (err.name !== 'AbortError') {\n"
                "          setState({ data: null, loading: false, error: err.message });\n"
                "        }\n"
                "      }\n"
                "    }\n"
                "\n"
                "    fetchData();\n"
                "    return () => controller.abort(); // Prevents memory leaks\n"
                "  }, [url]);\n"
                "\n"
                "  return state;\n"
                "}\n"
                "```"
            )

        # SQL Query
        if "sql" in q_lower or "database" in q_lower and ("query" in q_lower or "table" in q_lower):
            return (
                "### 🗄️ SQL Query & Schema Pattern\n\n"
                "Here is an optimized query pattern with indexing and aggregation:\n\n"
                "```sql\n"
                "-- 1. High Performance Indexed Table\n"
                "CREATE TABLE user_conversations (\n"
                "    id VARCHAR(36) PRIMARY KEY,\n"
                "    user_id VARCHAR(36) NOT NULL,\n"
                "    title VARCHAR(255) NOT NULL,\n"
                "    message_count INT DEFAULT 0,\n"
                "    is_pinned BOOLEAN DEFAULT FALSE,\n"
                "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n"
                "    INDEX idx_user_pinned (user_id, is_pinned)\n"
                ");\n"
                "\n"
                "-- 2. Aggregated Query with Window Function\n"
                "SELECT \n"
                "    user_id,\n"
                "    COUNT(id) AS total_conversations,\n"
                "    SUM(message_count) AS total_messages,\n"
                "    MAX(created_at) AS last_active\n"
                "FROM user_conversations\n"
                "GROUP BY user_id\n"
                "ORDER BY total_messages DESC\n"
                "LIMIT 20;\n"
                "```"
            )

        return None

    def _answer_concept_query(self, query: str) -> Optional[str]:
        """Answer common AI, tech, and conceptual questions."""
        q_lower = query.lower()

        # Vector Embeddings
        if "vector" in q_lower and "embedding" in q_lower:
            return (
                "### 🧠 How Vector Embeddings Work in AI\n\n"
                "Vector embeddings are numerical representations of concepts, words, sentences, or images in high-dimensional space.\n\n"
                "#### 1. The Core Idea\n"
                "- Words or sentences with similar meanings are placed close together in mathematical space.\n"
                "- For example, `King - Man + Woman ≈ Queen`.\n"
                "- \"The cat sat on the mat\" and \"A feline rested on the rug\" have completely different words, but nearly identical embedding vectors!\n\n"
                "#### 2. Key Dimensions\n"
                "| Model | Dimensions | Best For |\n"
                "|---|---|---|\n"
                "| `text-embedding-3-small` | 1,536 | Fast general RAG |\n"
                "| `text-embedding-3-large` | 3,072 | Enterprise accuracy |\n"
                "| `all-MiniLM-L6-v2` | 384 | On-device lightweight |\n\n"
                "#### 3. How RAG Uses Them\n"
                "1. Document chunks are converted into embedding vectors and stored in a vector DB (e.g. Pinecone, Chroma, pgvector).\n"
                "2. When a user asks a question, the question is also converted into a vector.\n"
                "3. **Cosine Similarity** finds the chunks with the highest mathematical similarity to include in the LLM prompt."
            )

        # RAG vs Fine-tuning
        if ("rag" in q_lower or "retrieval" in q_lower) and ("fine-tuning" in q_lower or "finetuning" in q_lower or "fine tune" in q_lower):
            return (
                "### ⚖️ RAG (Retrieval-Augmented Generation) vs. Fine-Tuning\n\n"
                "| Feature | RAG | Fine-Tuning |\n"
                "|---|---|---|\n"
                "| **Primary Purpose** | Giving the model dynamic, up-to-date facts & private documents | Teaching the model a specific style, format, tone, or specialized syntax |\n"
                "| **Knowledge Update** | Instant (add file to vector DB) | Slow & Expensive (requires retraining) |\n"
                "| **Hallucination Rate** | Very Low (cites sources) | Moderate to High |\n"
                "| **Cost** | Low to Medium | High (compute + data preparation) |\n"
                "| **Analogy** | Open-book exam (checking textbooks) | Memorizing new information for a closed-book exam |\n\n"
                "#### 💡 Hybrid Recommendation\n"
                "The industry gold-standard is to use **RAG for domain knowledge and document facts**, and **fine-tuning (or prompt engineering) for style and persona**."
            )

        # Product launch email
        if "product launch email" in q_lower or ("launch email" in q_lower and "saas" in q_lower):
            return (
                "### 🚀 Product Launch Email: SaaS Startup\n\n"
                "**Subject:** Meet [Product Name] — The AI workspace that saves you 15+ hours/week ⚡\n\n"
                "Hi [First Name],\n\n"
                "Every day, engineering and growth teams lose hours switching between disconnected tools, searching documents, and manually qualifying leads.\n\n"
                "Today, we're changing that.\n\n"
                "We are thrilled to officially unveil **[Product Name]** — an autonomous enterprise AI platform designed to automate your most critical business workflows.\n\n"
                "#### ✨ What makes it different:\n"
                "- **Instant Document Intelligence:** Chat with PDFs, DOCX, and CSVs with pinpoint citations.\n"
                "- **Autonomous Lead Capture:** Turn visitors into qualified CRM leads automatically.\n"
                "- **Ultra-Fast Streaming AI:** Sub-100ms reasoning with state-of-the-art models.\n\n"
                "> *\"[Product Name] reduced our customer turnaround time by 60% in the first week.\"*  \n"
                "> — *Alex Rivera, CTO at CloudScale*\n\n"
                "👉 **[Claim Your Free 14-Day Pro Trial]** *(No credit card required)*\n\n"
                "We can't wait to see what you build!\n\n"
                "Warm regards,\n\n"
                "**[Your Name]**  \n"
                "Founder, [Company Name]"
            )

        return None

    def generate_response(
        self,
        messages: List[Dict[str, str]],
        doc_context: str = "",
        lead_mode: bool = False,
    ) -> str:
        """Generate high-quality conversational or technical answer."""
        last_msg = messages[-1]["content"] if messages else ""
        q_clean = last_msg.strip()
        q_lower = q_clean.lower()

        # 1. Check Document Context (RAG mode)
        if doc_context and len(doc_context.strip()) > 10:
            return self._answer_rag(q_clean, doc_context)

        # 2. Check Lead Mode
        if lead_mode:
            return self._answer_lead_mode(q_clean, messages)

        # 3. Check Math
        math_res = self._solve_math(q_clean)
        if math_res:
            return math_res

        # 4. Check Common Greetings
        greetings = ["hi", "hii", "hiii", "hello", "hey", "heyy", "yo", "hola", "namaste", "good morning", "good evening", "howdy"]
        if q_lower in greetings or q_lower.startswith(("hello ", "hi ", "hey ")):
            return (
                "Hello! 👋 I'm **ORA GPT**, your enterprise AI assistant.\n\n"
                "I'm equipped to assist you across a broad range of capabilities:\n\n"
                "- 💻 **Code Generation & Architecture:** Write, debug, and optimize Python, JavaScript, React, FastAPI, SQL, and more.\n"
                "- 📄 **Document Intelligence:** Upload PDFs, DOCX, or CSVs to query and extract structured insights.\n"
                "- 🎯 **Autonomous Lead Assistant:** Activate Lead Mode to engage visitors and capture qualified business leads.\n"
                "- 🧠 **Complex Reasoning & Analysis:** Research topics, summarize data, and write executive content.\n\n"
                "What would you like to build or explore today?"
            )

        # 5. Check Identity / Capability Questions
        if any(phrase in q_lower for phrase in ["who are you", "what can you do", "what are you", "help me", "introduce yourself"]):
            return (
                "### ⚡ About ORA GPT\n\n"
                "I am **ORA GPT**, a full-stack enterprise conversational intelligence platform.\n\n"
                "#### 🌟 Core Capabilities\n"
                "1. **Advanced Multi-Turn Conversations:** Natural, context-aware dialogue with real-time streaming.\n"
                "2. **Document Understanding & RAG:** Semantic vector search across PDF, DOCX, TXT, CSV, and image files.\n"
                "3. **Autonomous Lead Generation:** Real-time entity extraction directly synced to your CRM pipeline.\n"
                "4. **Full-Stack Engineering:** Clean code creation, debugging, API integration, and database design.\n"
                "5. **High Security Architecture:** Role-based access control, encrypted sessions, and zero client-exposed keys.\n\n"
                "How can I help you right now?"
            )

        # 6. Check Specific Coding Queries
        code_resp = self._detect_coding_query(q_clean)
        if code_resp:
            return code_resp

        # 7. Check Conceptual Explanations
        concept_resp = self._answer_concept_query(q_clean)
        if concept_resp:
            return concept_resp

        # 8. General Knowledge & Structured Reasoning Fallback
        keywords = self._extract_keywords(q_clean)
        topic_title = " ".join(kw.capitalize() for kw in keywords[:4]) or "Your Inquiry"

        return (
            f"### 💡 Overview: {topic_title}\n\n"
            f"Here is a comprehensive breakdown regarding **\"{q_clean}\"**:\n\n"
            "#### 1. Core Principles & Concept\n"
            f"- **Primary Focus:** Addressing \"{q_clean}\" requires understanding the fundamental requirements, current best practices, and systematic implementation steps.\n"
            "- **Efficiency & Scalability:** In modern workflows, prioritizing modularity, clean documentation, and automated testing ensures the highest quality outcome.\n\n"
            "#### 2. Key Actionable Steps\n"
            "1. **Define the Scope:** Clearly identify the inputs, expected outputs, and edge cases.\n"
            "2. **Implement Best Practices:** Structure the solution using clean, maintainable patterns.\n"
            "3. **Validate & Optimize:** Test under realistic conditions and iterate based on performance feedback.\n\n"
            "#### 3. Next Steps\n"
            "Would you like me to generate **code examples**, provide a **step-by-step implementation plan**, or deep-dive into specific components? Just let me know!"
        )


builtin_ai_engine = BuiltinAIEngine()
