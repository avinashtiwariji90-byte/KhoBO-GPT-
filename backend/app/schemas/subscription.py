from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class PlanFeature(BaseModel):
    name: str
    included: bool

class PlanDetail(BaseModel):
    id: str
    name: str
    price_monthly: float
    price_yearly: float
    description: str
    message_limit: int
    file_limit: int
    features: List[str]
    popular: bool = False

class SubscribeRequest(BaseModel):
    plan: str # "free", "business", "pro"
    payment_method: Optional[str] = "mock_card_demo"
    billing_cycle: Optional[str] = "monthly"

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan: str
    status: str
    amount: float
    current_period_end: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UsageResponse(BaseModel):
    messages_count: int
    messages_limit: int
    files_count: int
    files_limit: int
    plan: str
    percent_messages: float
    percent_files: float
