import os
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.api.deps import get_current_admin
from app.db.models import User
from app.services.llm_service import llm_service

router = APIRouter()


class AIKeysUpdate(BaseModel):
    groq_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None


@router.get("/ai-status")
async def get_ai_status(admin: User = Depends(get_current_admin)):
    """Returns the current active AI engine and status of configured keys (Admin only)."""
    return llm_service.get_engine_status()


@router.post("/ai-keys")
async def update_ai_keys(
    keys_in: AIKeysUpdate,
    admin: User = Depends(get_current_admin)
):
    """
    Update Groq, Gemini, or OpenAI API keys at runtime and persist to .env.
    Restricted strictly to administrators.
    """
    env_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"
    )

    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    def set_env_var(key: str, val: Optional[str]):
        if val is None:
            return
        clean_val = val.strip()
        os.environ[key] = clean_val
        found = False
        for idx, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith(f"{key}=") or stripped.startswith(f"{key} ="):
                lines[idx] = f'{key}="{clean_val}"\n'
                found = True
                break
        if not found:
            lines.append(f'{key}="{clean_val}"\n')

    if keys_in.groq_api_key is not None:
        set_env_var("GROQ_API_KEY", keys_in.groq_api_key)
    if keys_in.gemini_api_key is not None:
        set_env_var("GEMINI_API_KEY", keys_in.gemini_api_key)
    if keys_in.openai_api_key is not None:
        set_env_var("OPENAI_API_KEY", keys_in.openai_api_key)

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)

    llm_service.reload_keys()

    return {
        "status": "success",
        "message": "AI keys updated successfully",
        "engine_status": llm_service.get_engine_status()
    }
