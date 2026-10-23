from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class LeadCreate(BaseModel):
    name: str
    contact: str
    requirement: str
    budget: Optional[str] = None
    location: Optional[str] = None
    source: Optional[str] = "AI Assistant"
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None
    requirement: Optional[str] = None
    budget: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None # "New", "Contacted", "Qualified", "Converted", "Closed"
    notes: Optional[str] = None

class LeadResponse(BaseModel):
    id: str
    business_id: Optional[str] = None
    user_id: Optional[str] = None
    name: str
    contact: str
    requirement: str
    budget: Optional[str] = None
    location: Optional[str] = None
    source: str
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LeadStats(BaseModel):
    total_leads: int
    new_leads: int
    contacted_leads: int
    qualified_leads: int
    converted_leads: int
    closed_leads: int
    conversion_rate: float
