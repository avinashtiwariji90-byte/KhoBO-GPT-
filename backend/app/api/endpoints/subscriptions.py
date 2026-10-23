import uuid
from datetime import datetime, timezone, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.db.models import User, Subscription, Usage, AuditLog
from app.schemas.subscription import PlanDetail, SubscribeRequest, SubscriptionResponse, UsageResponse
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter()

PLANS = [
    PlanDetail(
        id="free",
        name="Free Explorer",
        price_monthly=0.0,
        price_yearly=0.0,
        description="Ideal for personal experimentation, quick questions, and light document queries.",
        message_limit=settings.FREE_MESSAGE_LIMIT,
        file_limit=settings.FREE_FILE_LIMIT,
        features=[
            f"{settings.FREE_MESSAGE_LIMIT} AI chat queries/month",
            f"{settings.FREE_FILE_LIMIT} Document uploads (PDF, TXT, DOCX)",
            "Standard response latency",
            "Contextual chat history",
            "Markdown & Code highlighting"
        ],
        popular=False
    ),
    PlanDetail(
        id="business",
        name="Business Lead Pro",
        price_monthly=39.0,
        price_yearly=390.0,
        description="Built for growing agencies and startups requiring automated lead capture & team dashboards.",
        message_limit=settings.BUSINESS_MESSAGE_LIMIT,
        file_limit=settings.BUSINESS_FILE_LIMIT,
        features=[
            f"{settings.BUSINESS_MESSAGE_LIMIT} AI chat queries/month",
            f"{settings.BUSINESS_FILE_LIMIT} Document vector uploads",
            "AI Lead Assistant & automatic capture",
            "Dedicated Business Dashboard",
            "CRM status tracking & CSV export",
            "Priority response times"
        ],
        popular=True
    ),
    PlanDetail(
        id="pro",
        name="Enterprise Pro",
        price_monthly=89.0,
        price_yearly=890.0,
        description="For power users and enterprises requiring maximum speed, unlimited capacity & audit logs.",
        message_limit=settings.PRO_MESSAGE_LIMIT,
        file_limit=settings.PRO_FILE_LIMIT,
        features=[
            f"{settings.PRO_MESSAGE_LIMIT} AI chat queries/month",
            f"{settings.PRO_FILE_LIMIT} Large document uploads (up to 25MB each)",
            "Advanced neural reasoning & streaming",
            "Full Business & Lead analytics",
            "Audit logging & compliance security",
            "24/7 Priority SLA support"
        ],
        popular=False
    )
]

@router.get("/plans", response_model=List[PlanDetail])
async def get_plans():
    return PLANS

@router.get("/usage", response_model=UsageResponse)
async def get_usage(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Usage).where(Usage.user_id == current_user.id))
    usage = res.scalars().first()
    if not usage:
        usage = Usage(user_id=current_user.id, messages_count=0, files_count=0)
        db.add(usage)
        await db.commit()
        await db.refresh(usage)

    limit_m = settings.FREE_MESSAGE_LIMIT
    limit_f = settings.FREE_FILE_LIMIT
    if current_user.plan == "business":
        limit_m = settings.BUSINESS_MESSAGE_LIMIT
        limit_f = settings.BUSINESS_FILE_LIMIT
    elif current_user.plan == "pro" or current_user.role == "admin":
        limit_m = settings.PRO_MESSAGE_LIMIT
        limit_f = settings.PRO_FILE_LIMIT

    p_msgs = min(100.0, round((usage.messages_count / limit_m * 100), 1)) if limit_m > 0 else 0
    p_files = min(100.0, round((usage.files_count / limit_f * 100), 1)) if limit_f > 0 else 0

    return UsageResponse(
        messages_count=usage.messages_count,
        messages_limit=limit_m,
        files_count=usage.files_count,
        files_limit=limit_f,
        plan=current_user.plan,
        percent_messages=p_msgs,
        percent_files=p_files
    )

@router.post("/subscribe", response_model=SubscriptionResponse)
async def subscribe_plan(
    sub_data: SubscribeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    plan_key = sub_data.plan.lower()
    if plan_key not in ["free", "business", "pro"]:
        raise HTTPException(status_code=400, detail="Invalid plan selected")

    amount = 0.0
    if plan_key == "business":
        amount = 39.0 if sub_data.billing_cycle == "monthly" else 390.0
    elif plan_key == "pro":
        amount = 89.0 if sub_data.billing_cycle == "monthly" else 890.0

    # Create mock subscription record
    sub = Subscription(
        user_id=current_user.id,
        plan=plan_key,
        status="active",
        amount=amount,
        payment_id=f"pay_mock_{uuid.uuid4().hex[:12]}",
        current_period_end=datetime.now(timezone.utc) + timedelta(days=365 if sub_data.billing_cycle == "yearly" else 30)
    )
    db.add(sub)

    # Update user plan
    current_user.plan = plan_key
    if plan_key in ["business", "pro"] and current_user.role == "user":
        current_user.role = "business"

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        action="SUBSCRIPTION_UPGRADED",
        details=f"Upgraded plan to {plan_key.upper()} with payment amount ${amount}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(sub)

    return sub

@router.get("/current", response_model=List[SubscriptionResponse])
async def get_current_subscriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id).order_by(desc(Subscription.created_at))
    )
    subs = res.scalars().all()
    return subs
