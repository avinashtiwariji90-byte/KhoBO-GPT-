from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class FileResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    mime_type: str
    indexed: bool
    created_at: datetime
    extracted_text_preview: Optional[str] = None

    class Config:
        from_attributes = True
