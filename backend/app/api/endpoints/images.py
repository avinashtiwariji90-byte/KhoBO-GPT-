import urllib.parse
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from app.db.models import User
from app.api.deps import get_current_user
from app.services.llm_service import llm_service

router = APIRouter()

@router.get("/generate")
async def generate_image(
    prompt: str = Query(..., description="Image generation prompt"),
    width: int = Query(1024, ge=256, le=2048),
    height: int = Query(768, ge=256, le=2048),
    current_user: User = Depends(get_current_user)
):
    """
    Generate an image using Pollinations AI (free, no API key required).
    Returns the image URL and markdown to embed it.
    """
    image_url = llm_service.generate_image_url(prompt, width, height)
    encoded_prompt = urllib.parse.quote(prompt)
    
    return JSONResponse({
        "url": image_url,
        "prompt": prompt,
        "width": width,
        "height": height,
        "markdown": f"![{prompt}]({image_url})",
        "provider": "Pollinations AI"
    })
