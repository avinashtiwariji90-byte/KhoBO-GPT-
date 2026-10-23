from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.db.models import User, Business, Usage, AuditLog
from app.schemas.auth import UserRegister, UserLogin, Token, UserResponse, UserUpdate
from app.core.security import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=Token)
async def register(user_in: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )

    # Normalize role
    role = user_in.role if user_in.role in ["user", "business"] else "user"
    plan = "business" if role == "business" else "free"

    # Create user
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=role,
        plan=plan,
        is_active=True,
        is_suspended=False
    )
    db.add(user)
    await db.flush()

    # If business role, create business profile
    company_name = None
    if role == "business":
        company_name = user_in.company_name or f"{user_in.full_name or 'My'} Enterprise"
        biz = Business(
            user_id=user.id,
            company_name=company_name,
            industry=user_in.industry or "Technology & AI",
        )
        db.add(biz)

    # Initialize usage tracking
    usage = Usage(
        user_id=user.id,
        messages_count=0,
        files_count=0,
        period_start=datetime.now(timezone.utc)
    )
    db.add(usage)

    # Log action
    audit = AuditLog(
        user_id=user.id,
        action="USER_REGISTER",
        details=f"User registered with role: {role}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(subject=user.id, role=user.role)
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        plan=user.plan,
        is_active=user.is_active,
        is_suspended=user.is_suspended,
        created_at=user.created_at,
        company_name=company_name
    )

    return Token(access_token=access_token, token_type="bearer", user=user_resp)

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended. Please contact support."
        )

    # Fetch company name if business
    company_name = None
    if user.role in ["business", "admin"]:
        biz_res = await db.execute(select(Business).where(Business.user_id == user.id))
        biz = biz_res.scalars().first()
        if biz:
            company_name = biz.company_name

    # Log audit
    audit = AuditLog(
        user_id=user.id,
        action="USER_LOGIN",
        details="User successfully authenticated"
    )
    db.add(audit)
    await db.commit()

    access_token = create_access_token(subject=user.id, role=user.role)
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        plan=user.plan,
        is_active=user.is_active,
        is_suspended=user.is_suspended,
        created_at=user.created_at,
        company_name=company_name
    )

    return Token(access_token=access_token, token_type="bearer", user=user_resp)

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    company_name = None
    if current_user.role in ["business", "admin"]:
        biz_res = await db.execute(select(Business).where(Business.user_id == current_user.id))
        biz = biz_res.scalars().first()
        if biz:
            company_name = biz.company_name

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        plan=current_user.plan,
        is_active=current_user.is_active,
        is_suspended=current_user.is_suspended,
        created_at=current_user.created_at,
        company_name=company_name
    )

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if update_data.full_name is not None:
        current_user.full_name = update_data.full_name

    company_name = None
    if current_user.role in ["business", "admin"]:
        biz_res = await db.execute(select(Business).where(Business.user_id == current_user.id))
        biz = biz_res.scalars().first()
        if biz:
            if update_data.company_name is not None:
                biz.company_name = update_data.company_name
            if update_data.industry is not None:
                biz.industry = update_data.industry
            if update_data.website is not None:
                biz.website = update_data.website
            if update_data.phone is not None:
                biz.phone = update_data.phone
            company_name = biz.company_name

    await db.commit()
    await db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        plan=current_user.plan,
        is_active=current_user.is_active,
        is_suspended=current_user.is_suspended,
        created_at=current_user.created_at,
        company_name=company_name
    )
