from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
from app.schemas.auth import UserResponse
from app.schemas.lead import LeadResponse

class AdminStatsResponse(BaseModel):
    total_users: int
    total_businesses: int
    total_conversations: int
    total_messages: int
    total_files: int
    total_leads: int
    active_subscriptions: int
    estimated_revenue: float
    system_status: str

class UserAdminUpdate(BaseModel):
    is_suspended: Optional[bool] = None
    role: Optional[str] = None
    plan: Optional[str] = None

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    action: str
    ip_address: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class BusinessAdminItem(BaseModel):
    id: str
    user_id: str
    company_name: str
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    leads_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
