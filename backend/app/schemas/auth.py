import re
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=100)
    role: str = Field(default="user", pattern="^(user|business)$")
    company_name: Optional[str] = Field(None, max_length=200)
    industry: Optional[str] = Field(None, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        return v.lower().strip()


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    plan: str
    is_active: bool
    is_suspended: bool
    created_at: datetime
    company_name: Optional[str] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    company_name: Optional[str] = Field(None, max_length=200)
    industry: Optional[str] = Field(None, max_length=100)
    website: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=30)
