from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.session import get_db
from app.db.models import User, Business, Lead
from app.api.deps import get_current_business
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

class BusinessProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    lead_webhook_url: Optional[str] = None

@router.get("/profile")
async def get_business_profile(
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Business).where(Business.user_id == current_user.id))
    biz = res.scalars().first()
    if not biz:
        # Create a default business profile if missing
        biz = Business(
            user_id=current_user.id,
            company_name=f"{current_user.full_name or 'My'} Enterprise",
            industry="Technology & Services"
        )
        db.add(biz)
        await db.commit()
        await db.refresh(biz)

    # Lead count
    lead_count_res = await db.execute(select(func.count(Lead.id)).where(Lead.business_id == biz.id))
    total_leads = lead_count_res.scalar() or 0

    return {
        "id": biz.id,
        "company_name": biz.company_name,
        "industry": biz.industry,
        "website": biz.website,
        "phone": biz.phone,
        "lead_webhook_url": biz.lead_webhook_url,
        "total_leads": total_leads,
        "created_at": biz.created_at
    }

@router.put("/profile")
async def update_business_profile(
    profile_data: BusinessProfileUpdate,
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Business).where(Business.user_id == current_user.id))
    biz = res.scalars().first()
    if not biz:
        biz = Business(user_id=current_user.id, company_name="My Company")
        db.add(biz)

    if profile_data.company_name is not None:
        biz.company_name = profile_data.company_name
    if profile_data.industry is not None:
        biz.industry = profile_data.industry
    if profile_data.website is not None:
        biz.website = profile_data.website
    if profile_data.phone is not None:
        biz.phone = profile_data.phone
    if profile_data.lead_webhook_url is not None:
        biz.lead_webhook_url = profile_data.lead_webhook_url

    await db.commit()
    await db.refresh(biz)

    return {"status": "success", "message": "Business profile updated", "business": biz.company_name}

@router.get("/analytics")
async def get_business_analytics(
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Business).where(Business.user_id == current_user.id))
    biz = res.scalars().first()
    biz_id = biz.id if biz else None

    # Status distribution
    leads_res = await db.execute(select(Lead).where(Lead.business_id == biz_id) if biz_id else select(Lead))
    all_leads = leads_res.scalars().all()

    status_dist = {
        "New": 0,
        "Contacted": 0,
        "Qualified": 0,
        "Converted": 0,
        "Closed": 0
    }
    for l in all_leads:
        status_dist[l.status] = status_dist.get(l.status, 0) + 1

    sources = {}
    for l in all_leads:
        s = l.source or "Direct"
        sources[s] = sources.get(s, 0) + 1

    return {
        "total_leads": len(all_leads),
        "status_distribution": status_dist,
        "sources_breakdown": sources,
        "conversion_rate": round((status_dist["Converted"] / len(all_leads) * 100), 1) if all_leads else 0.0
    }
