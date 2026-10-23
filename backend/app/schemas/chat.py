from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class MessageCreate(BaseModel):
    conversation_id: Optional[str] = None
    content: str
    lead_assistant_mode: bool = False
    file_ids: Optional[List[str]] = None

class MessageEdit(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    tokens: int
    meta_info: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ConversationRename(BaseModel):
    title: str

class ConversationResponse(BaseModel):
    id: str
    title: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    last_message: Optional[str] = None
    message_count: Optional[int] = 0

    class Config:
        from_attributes = True

class ConversationDetail(BaseModel):
    id: str
    title: str
    is_pinned: bool
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []

    class Config:
        from_attributes = True
