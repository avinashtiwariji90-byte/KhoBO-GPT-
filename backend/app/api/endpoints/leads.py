import csv
import io
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func, or_
from app.db.session import get_db
from app.db.models import User, Lead, Business, AuditLog
from app.schemas.lead import LeadCreate, LeadUpdate, LeadResponse, LeadStats
from app.api.deps import get_current_business

router = APIRouter()

@router.get("", response_model=List[LeadResponse])
async def list_leads(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    query = select(Lead)
    
    # If business user, show leads for their business or created in system
    if current_user.role != "admin":
        biz_res = await db.execute(select(Business).where(Business.user_id == current_user.id))
        biz = biz_res.scalars().first()
        if biz:
            query = query.where(or_(Lead.business_id == biz.id, Lead.business_id.is_(None)))
        else:
            query = query.where(Lead.user_id == current_user.id)

    if status_filter and status_filter.lower() != "all":
        query = query.where(Lead.status.ilike(status_filter))

    if search:
        s = f"%{search}%"
        query = query.where(
            or_(
                Lead.name.ilike(s),
                Lead.contact.ilike(s),
                Lead.requirement.ilike(s),
                Lead.location.ilike(s)
            )
        )

    query = query.order_by(desc(Lead.created_at))
    result = await db.execute(query)
    leads = result.scalars().all()

    return leads

@router.get("/stats", response_model=LeadStats)
async def get_lead_stats(
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    query = select(Lead)
    if current_user.role != "admin":
        biz_res = await db.execute(select(Business).where(Business.user_id == current_user.id))
        biz = biz_res.scalars().first()
        if biz:
            query = query.where(or_(Lead.business_id == biz.id, Lead.business_id.is_(None)))

    result = await db.execute(query)
    all_leads = result.scalars().all()

    total = len(all_leads)
    new_c = sum(1 for l in all_leads if l.status == "New")
    cont_c = sum(1 for l in all_leads if l.status == "Contacted")
    qual_c = sum(1 for l in all_leads if l.status == "Qualified")
    conv_c = sum(1 for l in all_leads if l.status == "Converted")
    clos_c = sum(1 for l in all_leads if l.status == "Closed")

    conversion_rate = round((conv_c / total * 100), 1) if total > 0 else 0.0

    return LeadStats(
        total_leads=total,
        new_leads=new_c,
        contacted_leads=cont_c,
        qualified_leads=qual_c,
        converted_leads=conv_c,
        closed_leads=clos_c,
        conversion_rate=conversion_rate
    )

@router.post("", response_model=LeadResponse)
async def create_lead(
    lead_in: LeadCreate,
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    biz_id = None
    biz_res = await db.execute(select(Business).where(Business.user_id == current_user.id))
    biz = biz_res.scalars().first()
    if biz:
        biz_id = biz.id

    lead = Lead(
        business_id=biz_id,
        user_id=current_user.id,
        name=lead_in.name,
        contact=lead_in.contact,
        requirement=lead_in.requirement,
        budget=lead_in.budget,
        location=lead_in.location,
        source=lead_in.source or "Manual Entry",
        status="New",
        notes=lead_in.notes
    )
    db.add(lead)
    await db.commit()
    await db.refresh(lead)

    return lead

@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    update_data: LeadUpdate,
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    if update_data.status is not None:
        lead.status = update_data.status
    if update_data.notes is not None:
        lead.notes = update_data.notes
    if update_data.name is not None:
        lead.name = update_data.name
    if update_data.contact is not None:
        lead.contact = update_data.contact
    if update_data.requirement is not None:
        lead.requirement = update_data.requirement
    if update_data.budget is not None:
        lead.budget = update_data.budget
    if update_data.location is not None:
        lead.location = update_data.location

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        action="LEAD_UPDATED",
        details=f"Updated lead {lead.id} to status '{lead.status}'"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(lead)

    return lead

@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = res.scalars().first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    await db.delete(lead)
    await db.commit()
    return {"status": "success", "message": "Lead deleted"}

@router.get("/export/csv")
async def export_leads_csv(
    current_user: User = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    query = select(Lead).order_by(desc(Lead.created_at))
    if current_user.role != "admin":
        biz_res = await db.execute(select(Business).where(Business.user_id == current_user.id))
        biz = biz_res.scalars().first()
        if biz:
            query = query.where(or_(Lead.business_id == biz.id, Lead.business_id.is_(None)))

    res = await db.execute(query)
    leads = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Lead ID", "Name", "Contact", "Requirement", "Budget", "Location", "Source", "Status", "Notes", "Created Date"])

    for l in leads:
        writer.writerow([
            l.id,
            l.name,
            l.contact,
            l.requirement,
            l.budget or "N/A",
            l.location or "N/A",
            l.source,
            l.status,
            l.notes or "",
            l.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    csv_data = output.getvalue()
    filename = f"ora_gpt_leads_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
