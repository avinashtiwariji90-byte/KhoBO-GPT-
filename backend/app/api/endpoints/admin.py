from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.session import get_db
from app.db.models import User, Business, Conversation, Message, UploadedFile, Lead, Subscription, Usage, AuditLog
from app.schemas.admin import AdminStatsResponse, UserAdminUpdate, AuditLogResponse, BusinessAdminItem
from app.schemas.auth import UserResponse
from app.api.deps import get_current_admin

router = APIRouter()

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    users_c = await db.execute(select(func.count(User.id)))
    biz_c = await db.execute(select(func.count(Business.id)))
    convos_c = await db.execute(select(func.count(Conversation.id)))
    msgs_c = await db.execute(select(func.count(Message.id)))
    files_c = await db.execute(select(func.count(UploadedFile.id)))
    leads_c = await db.execute(select(func.count(Lead.id)))
    subs_c = await db.execute(select(func.count(Subscription.id)).where(Subscription.status == "active"))
    
    # Calculate revenue from subscriptions
    rev_res = await db.execute(select(func.sum(Subscription.amount)).where(Subscription.status == "active"))
    revenue = rev_res.scalar() or 0.0

    return AdminStatsResponse(
        total_users=users_c.scalar() or 0,
        total_businesses=biz_c.scalar() or 0,
        total_conversations=convos_c.scalar() or 0,
        total_messages=msgs_c.scalar() or 0,
        total_files=files_c.scalar() or 0,
        total_leads=leads_c.scalar() or 0,
        active_subscriptions=subs_c.scalar() or 0,
        estimated_revenue=float(revenue),
        system_status="Operational • High Availability"
    )

@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).order_by(desc(User.created_at)))
    users = res.scalars().all()
    return [
        UserResponse(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role,
            plan=u.plan,
            is_active=u.is_active,
            is_suspended=u.is_suspended,
            created_at=u.created_at
        ) for u in users
    ]

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    update_data: UserAdminUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id and update_data.is_suspended is True:
        raise HTTPException(status_code=400, detail="Cannot suspend the logged-in administrator")

    if update_data.is_suspended is not None:
        user.is_suspended = update_data.is_suspended
    if update_data.role is not None:
        user.role = update_data.role
    if update_data.plan is not None:
        user.plan = update_data.plan

    audit = AuditLog(
        user_id=admin.id,
        action="ADMIN_UPDATE_USER",
        details=f"Admin {admin.email} updated user {user.email}: suspended={user.is_suspended}, role={user.role}, plan={user.plan}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(user)

    return {"status": "success", "message": "User updated", "user": user.email, "is_suspended": user.is_suspended}

@router.get("/businesses", response_model=List[BusinessAdminItem])
async def list_all_businesses(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Business).order_by(desc(Business.created_at)))
    businesses = res.scalars().all()

    items = []
    for b in businesses:
        count_res = await db.execute(select(func.count(Lead.id)).where(Lead.business_id == b.id))
        count = count_res.scalar() or 0
        items.append(BusinessAdminItem(
            id=b.id,
            user_id=b.user_id,
            company_name=b.company_name,
            industry=b.industry,
            website=b.website,
            phone=b.phone,
            leads_count=count,
            created_at=b.created_at
        ))
    return items

@router.get("/conversations-metadata")
async def list_conversations_metadata(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Provides privacy-compliant metadata for admin inspection without leaking message bodies."""
    res = await db.execute(select(Conversation).order_by(desc(Conversation.created_at)).limit(50))
    convos = res.scalars().all()

    output = []
    for c in convos:
        count_res = await db.execute(select(func.count(Message.id)).where(Message.conversation_id == c.id))
        msg_count = count_res.scalar() or 0
        output.append({
            "conversation_id": c.id,
            "user_id": c.user_id,
            "title": c.title,
            "is_pinned": c.is_pinned,
            "message_count": msg_count,
            "created_at": c.created_at,
            "updated_at": c.updated_at
        })
    return output

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(AuditLog).order_by(desc(AuditLog.timestamp)).limit(100))
    logs = res.scalars().all()
    return logs
