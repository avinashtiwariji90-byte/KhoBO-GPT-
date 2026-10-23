import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.db.session import engine, Base, AsyncSessionLocal
from app.db.models import User, Business, Lead, Subscription, Usage, AuditLog
from app.core.security import get_password_hash

async def init_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if admin already exists
        result = await session.execute(
            select(User).where((User.email == "admin@oragpt.ai") | (User.role == "admin"))
        )
        admin_user = result.scalars().first()

        if not admin_user:
            admin = User(
                email="admin@oragpt.ai",
                hashed_password=get_password_hash("Admin@123"),
                full_name="ORA GPT Administrator",
                role="admin",
                plan="pro",
                is_active=True,
                is_suspended=False
            )
            session.add(admin)
            await session.flush()

            admin_usage = Usage(
                user_id=admin.id,
                messages_count=5,
                files_count=1,
                period_start=datetime.now(timezone.utc)
            )
            session.add(admin_usage)
            admin_id = admin.id
        else:
            admin_id = admin_user.id

        # 2. Check Business User
        biz_result = await session.execute(select(User).where(User.email == "business@oragpt.ai"))
        biz_user = biz_result.scalars().first()

        if not biz_user:
            biz_user = User(
                email="business@oragpt.ai",
                hashed_password=get_password_hash("Business@123"),
                full_name="Sara Jenkins",
                role="business",
                plan="business",
                is_active=True,
                is_suspended=False
            )
            session.add(biz_user)
            await session.flush()

            business_profile = Business(
                user_id=biz_user.id,
                company_name="Apex Cloud Innovations",
                industry="Cloud & AI Solutions",
                website="https://apexcloud.example.com",
                phone="+1 (555) 234-8900"
            )
            session.add(business_profile)
            await session.flush()

            biz_sub = Subscription(
                user_id=biz_user.id,
                plan="business",
                status="active",
                amount=49.0,
                payment_id="sub_mock_biz_9921",
                current_period_end=datetime.now(timezone.utc) + timedelta(days=30)
            )
            session.add(biz_sub)

            biz_usage = Usage(
                user_id=biz_user.id,
                messages_count=42,
                files_count=6,
                period_start=datetime.now(timezone.utc)
            )
            session.add(biz_usage)

            # Seed Leads for the business
            leads_data = [
                {
                    "name": "David Miller",
                    "contact": "david.miller@enterprise.io | +1 415-890-1234",
                    "requirement": "Enterprise AI agent deployment with internal PDF document querying and vector search.",
                    "budget": "$10,000 - $25,000",
                    "location": "San Francisco, CA",
                    "status": "New",
                    "source": "Landing AI Chat"
                },
                {
                    "name": "Aarav Sharma",
                    "contact": "aarav.sharma@techgrowth.in | +91 98765-43210",
                    "requirement": "Automated WhatsApp & Web AI lead generation bot for B2B consulting firm.",
                    "budget": "$5,000 - $10,000",
                    "location": "Bangalore, India",
                    "status": "Qualified",
                    "source": "Website Widget"
                },
                {
                    "name": "Elena Rostova",
                    "contact": "elena@nordictech.se",
                    "requirement": "Custom fine-tuned customer support model integrated with PostgreSQL DB.",
                    "budget": "$15,000+",
                    "location": "Stockholm, Sweden",
                    "status": "Contacted",
                    "source": "AI Assistant"
                },
                {
                    "name": "Michael Chang",
                    "contact": "mchang@venturelab.sg | +65 6789-0123",
                    "requirement": "SaaS AI assistant white-label solution for fintech clients with high throughput.",
                    "budget": "$30,000+",
                    "location": "Singapore",
                    "status": "Converted",
                    "source": "Product Demo"
                },
                {
                    "name": "Sophie Laurent",
                    "contact": "sophie@parisretail.fr",
                    "requirement": "E-commerce conversational product recommendation assistant.",
                    "budget": "$3,000 - $6,000",
                    "location": "Paris, France",
                    "status": "Closed",
                    "source": "AI Assistant"
                }
            ]

            for item in leads_data:
                lead = Lead(
                    business_id=business_profile.id,
                    user_id=biz_user.id,
                    name=item["name"],
                    contact=item["contact"],
                    requirement=item["requirement"],
                    budget=item["budget"],
                    location=item["location"],
                    source=item["source"],
                    status=item["status"]
                )
                session.add(lead)

        # 3. Check Normal User
        norm_result = await session.execute(select(User).where(User.email == "user@oragpt.ai"))
        normal_user = norm_result.scalars().first()

        if not normal_user:
            normal_user = User(
                email="user@oragpt.ai",
                hashed_password=get_password_hash("User@123"),
                full_name="Alex Turner",
                role="user",
                plan="free",
                is_active=True,
                is_suspended=False
            )
            session.add(normal_user)
            await session.flush()

            user_usage = Usage(
                user_id=normal_user.id,
                messages_count=8,
                files_count=1,
                period_start=datetime.now(timezone.utc)
            )
            session.add(user_usage)

        # 4. Audit Log if not logged yet
        audit_res = await session.execute(select(AuditLog).where(AuditLog.action == "SYSTEM_INIT"))
        if not audit_res.scalars().first() and admin_id:
            log = AuditLog(
                user_id=admin_id,
                action="SYSTEM_INIT",
                ip_address="127.0.0.1",
                details="Database initialized with default seed accounts and sample leads."
            )
            session.add(log)

        await session.commit()
        print("[ORA GPT] Database verified and ready.")

if __name__ == "__main__":
    asyncio.run(init_database())
