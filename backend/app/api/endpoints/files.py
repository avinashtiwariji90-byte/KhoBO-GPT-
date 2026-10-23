import os
import re
import shutil
import uuid
import hashlib
import httpx
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db.models import User, UploadedFile, Usage, AuditLog
from app.schemas.file import FileResponse
from app.api.deps import get_current_user
from app.services.doc_service import doc_service
from app.core.config import settings

router = APIRouter()

ALLOWED_EXTENSIONS = {
    ".pdf", ".txt", ".docx", ".doc", ".csv", ".json", ".md",
    ".png", ".jpg", ".jpeg", ".webp"
}

@router.post("/upload", response_model=FileResponse)
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Check Usage Limits
    usage_res = await db.execute(select(Usage).where(Usage.user_id == current_user.id))
    usage = usage_res.scalars().first()
    if not usage:
        usage = Usage(user_id=current_user.id, messages_count=0, files_count=0)
        db.add(usage)
        await db.flush()

    file_limit = settings.FREE_FILE_LIMIT
    if current_user.plan == "business":
        file_limit = settings.BUSINESS_FILE_LIMIT
    elif current_user.plan == "pro" or current_user.role == "admin":
        file_limit = settings.PRO_FILE_LIMIT

    if usage.files_count >= file_limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"File upload limit reached for {current_user.plan.upper()} plan ({file_limit} files). Please upgrade your subscription."
        )

    # 2. Validate Extension & Sanitize Filename
    raw_name = os.path.basename(file.filename or "uploaded_document")
    # Strip any directory traversal patterns or dangerous control characters
    safe_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', raw_name)
    ext = os.path.splitext(safe_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Supported: PDF, TXT, DOCX, CSV, JSON, MD, Images"
        )

    # 3. Ensure upload directory exists
    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)

    # Save to disk with guaranteed unique random UUID
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    file_path = os.path.join(upload_dir, unique_name)

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size ({settings.MAX_UPLOAD_SIZE // (1024*1024)} MB)"
        )

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    # 4. Extract Text & Index
    mime = file.content_type or "application/octet-stream"
    extracted_text = doc_service.extract_text(file_path, mime)

    # 5. Save to database
    db_file = UploadedFile(
        user_id=current_user.id,
        conversation_id=conversation_id,
        filename=unique_name,
        original_filename=raw_name,
        file_path=file_path,
        file_size=len(content),
        mime_type=mime,
        extracted_text=extracted_text,
        indexed=bool(extracted_text and len(extracted_text) > 10)
    )
    db.add(db_file)
    usage.files_count += 1

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        action="FILE_UPLOAD",
        details=f"Uploaded file '{raw_name}' ({len(content)} bytes)"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(db_file)

    preview = (extracted_text[:200] + "...") if extracted_text and len(extracted_text) > 200 else extracted_text

    return FileResponse(
        id=db_file.id,
        filename=db_file.filename,
        original_filename=db_file.original_filename,
        file_size=db_file.file_size,
        mime_type=db_file.mime_type,
        indexed=db_file.indexed,
        created_at=db_file.created_at,
        extracted_text_preview=preview
    )

@router.get("/list", response_model=List[FileResponse])
async def list_files(
    conversation_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(UploadedFile).where(UploadedFile.user_id == current_user.id)
    if conversation_id:
        query = query.where(UploadedFile.conversation_id == conversation_id)
    
    query = query.order_by(desc(UploadedFile.created_at))
    result = await db.execute(query)
    files = result.scalars().all()

    return [
        FileResponse(
            id=f.id,
            filename=f.filename,
            original_filename=f.original_filename,
            file_size=f.file_size,
            mime_type=f.mime_type,
            indexed=f.indexed,
            created_at=f.created_at,
            extracted_text_preview=(f.extracted_text[:150] + "...") if f.extracted_text else None
        ) for f in files
    ]

@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UploadedFile).where(
            UploadedFile.id == file_id,
            UploadedFile.user_id == current_user.id
        )
    )
    file_record = result.scalars().first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    if os.path.exists(file_record.file_path):
        try:
            os.remove(file_record.file_path)
        except Exception:
            pass

    # Decrement usage if needed
    usage_res = await db.execute(select(Usage).where(Usage.user_id == current_user.id))
    usage = usage_res.scalars().first()
    if usage and usage.files_count > 0:
        usage.files_count -= 1

    await db.delete(file_record)
    await db.commit()
    return {"status": "success", "message": "File deleted successfully"}


@router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(UploadedFile).where(UploadedFile.id == file_id)
    )
    file_record = result.scalars().first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    # Strict ownership check: only owner or admin can download
    if file_record.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to access this file")

    if not os.path.exists(file_record.file_path):
        raise HTTPException(status_code=404, detail="File missing from storage")

    return FastAPIFileResponse(
        path=file_record.file_path,
        filename=file_record.original_filename,
        media_type=file_record.mime_type
    )


# ─── Public Image & Media Serving ─────────────────────────────────────────────

@router.get("/image/{filename}")
async def get_generated_image(filename: str):
    """
    Serve locally generated AI images safely and publicly.
    Allows <img> tags in frontend to load images without requiring auth headers.
    """
    safe_name = os.path.basename(filename)
    upload_dir = os.path.abspath(settings.UPLOAD_DIR)

    # Check uploads/generated first, then uploads
    gen_path = os.path.join(upload_dir, "generated", safe_name)
    if os.path.exists(gen_path):
        media_type = "image/jpeg"
        if safe_name.lower().endswith(".png"):
            media_type = "image/png"
        elif safe_name.lower().endswith(".gif"):
            media_type = "image/gif"
        elif safe_name.lower().endswith(".webp"):
            media_type = "image/webp"
        return FastAPIFileResponse(
            path=gen_path,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=31536000, immutable"}
        )

    base_path = os.path.join(upload_dir, safe_name)
    if os.path.exists(base_path):
        media_type = "image/jpeg"
        if safe_name.lower().endswith(".gif"):
            media_type = "image/gif"
        elif safe_name.lower().endswith(".png"):
            media_type = "image/png"
        return FastAPIFileResponse(
            path=base_path,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=31536000, immutable"}
        )

    raise HTTPException(status_code=404, detail="Image not found")


@router.get("/uploads/{filename}")
async def get_uploaded_media(filename: str):
    """Direct media accessor for generated animations (GIF) or uploads."""
    safe_name = os.path.basename(filename)
    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    file_path = os.path.join(upload_dir, safe_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    media_type = "image/gif" if safe_name.lower().endswith(".gif") else "image/jpeg"
    return FastAPIFileResponse(
        path=file_path,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"}
    )


@router.get("/proxy-image")
async def proxy_external_image(url: str, refresh: bool = False):
    """
    Proxy and locally cache external images (such as Pollinations AI)
    to bypass browser CORS, ad-blockers, ISP blocks, or slow client connections.
    """
    if not url or not (url.startswith("http://") or url.startswith("https://")):
        raise HTTPException(status_code=400, detail="Invalid image URL")

    url_hash = hashlib.sha256(url.encode("utf-8")).hexdigest()
    ext = ".gif" if ".gif" in url.lower() else ".jpg"
    cache_dir = os.path.join(os.path.abspath(settings.UPLOAD_DIR), "cache")
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, f"{url_hash}{ext}")

    # Return cached version if exists, valid, and not forced refresh
    if not refresh and os.path.exists(cache_file) and os.path.getsize(cache_file) > 1024:
        media_type = "image/gif" if ext == ".gif" else "image/jpeg"
        return FastAPIFileResponse(
            path=cache_file,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=86400, immutable"}
        )

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    }

    # URLs to try: original URL first, then fallback variants if pollinations
    urls_to_try = [url]
    if "pollinations.ai" in url:
        # Extract prompt if present for fallback queries
        match = re.search(r"/prompt/([^?]+)", url)
        if match:
            prompt_part = match.group(1)
            urls_to_try.append(f"https://image.pollinations.ai/prompt/{prompt_part}?model=turbo&nologo=true")
            urls_to_try.append(f"https://image.pollinations.ai/prompt/{prompt_part}?nologo=true")

    for target_url in urls_to_try:
        try:
            async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
                resp = await client.get(target_url, headers=headers)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    with open(cache_file, "wb") as f:
                        f.write(resp.content)
                    media_type = resp.headers.get("content-type", "image/jpeg")
                    return FastAPIFileResponse(
                        path=cache_file,
                        media_type=media_type,
                        headers={"Cache-Control": "public, max-age=86400"}
                    )
        except Exception as e:
            print(f"[IMAGE PROXY] Error fetching {target_url}: {e}")
            continue

    # If cache existed from before even if refresh failed, return it
    if os.path.exists(cache_file) and os.path.getsize(cache_file) > 0:
        return FastAPIFileResponse(cache_file, media_type="image/jpeg")

    raise HTTPException(status_code=502, detail="Failed to retrieve upstream image")

