import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="user", nullable=False) # "user", "business", "admin"
    plan = Column(String(50), default="free", nullable=False) # "free", "business", "pro"
    is_active = Column(Boolean, default=True, nullable=False)
    is_suspended = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    business = relationship("Business", back_populates="user", uselist=False, cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    files = relationship("UploadedFile", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    usage = relationship("Usage", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class Business(Base):
    __tablename__ = "businesses"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(255), nullable=False)
    industry = Column(String(100), nullable=True)
    website = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    lead_webhook_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="business")
    leads = relationship("Lead", back_populates="business", cascade="all, delete-orphan")


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="New Chat", nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    files = relationship("UploadedFile", back_populates="conversation")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # "user", "assistant", "system"
    content = Column(Text, nullable=False)
    tokens = Column(Integer, default=0)
    meta_info = Column(Text, nullable=True) # JSON string for citations, model info, etc.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    conversation = relationship("Conversation", back_populates="messages")


class UploadedFile(Base):
    __tablename__ = "files"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    extracted_text = Column(Text, nullable=True)
    indexed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="files")
    conversation = relationship("Conversation", back_populates="files")


class Lead(Base):
    __tablename__ = "leads"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    name = Column(String(255), nullable=False)
    contact = Column(String(255), nullable=False) # Phone or email
    requirement = Column(Text, nullable=False)
    budget = Column(String(100), nullable=True)
    location = Column(String(255), nullable=True)
    source = Column(String(100), default="AI Assistant", nullable=False)
    status = Column(String(50), default="New", nullable=False)  # "New", "Contacted", "Qualified", "Converted", "Closed"
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    business = relationship("Business", back_populates="leads")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan = Column(String(50), nullable=False)  # "free", "business", "pro"
    status = Column(String(50), default="active", nullable=False)  # "active", "canceled", "expired"
    amount = Column(Float, default=0.0, nullable=False)
    payment_id = Column(String(255), nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="subscriptions")


class Usage(Base):
    __tablename__ = "usage"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    messages_count = Column(Integer, default=0, nullable=False)
    files_count = Column(Integer, default=0, nullable=False)
    period_start = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    period_end = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="usage")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    ip_address = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="audit_logs")
