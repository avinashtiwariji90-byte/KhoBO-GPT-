import os
import time
from contextlib import asynccontextmanager
from collections import defaultdict
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.init_db import init_database
from app.api.endpoints import (
    auth,
    chat,
    files,
    leads,
    subscriptions,
    business,
    admin,
    config_api,
)


# ─── Simple In-Process Rate Limiter ──────────────────────────────────────────
# For production, replace with Redis-backed rate limiter (slowapi + redis)
_rate_store: dict = defaultdict(list)
_auth_rate_store: dict = defaultdict(list)
RATE_LIMIT = 120       # requests
RATE_WINDOW = 60       # seconds

AUTH_RATE_LIMIT = 10   # max 10 auth requests per minute per IP to block brute force
AUTH_RATE_WINDOW = 60  # seconds


def _check_rate_limit(ip: str, is_auth: bool = False) -> bool:
    now = time.time()
    store = _auth_rate_store if is_auth else _rate_store
    limit = AUTH_RATE_LIMIT if is_auth else RATE_LIMIT
    window = AUTH_RATE_WINDOW if is_auth else RATE_WINDOW

    history = store[ip]
    # Evict old timestamps
    store[ip] = [t for t in history if now - t < window]
    if len(store[ip]) >= limit:
        return False
    store[ip].append(now)
    return True


# ─── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[{settings.PROJECT_NAME}] Starting up — initialising database …")
    await init_database()
    upload_dir = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_dir, exist_ok=True)
    os.makedirs(os.path.join(upload_dir, "generated"), exist_ok=True)
    os.makedirs(os.path.join(upload_dir, "cache"), exist_ok=True)
    yield
    print(f"[{settings.PROJECT_NAME}] Shutting down cleanly.")


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Avinash GPT — Conversational AI, Document Intelligence & Lead Automation",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ─── Rate-Limit Middleware ─────────────────────────────────────────────────────
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Skip rate-limiting for health-check and OPTIONS
    if request.method == "OPTIONS" or request.url.path in ["/", "/health"]:
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    is_auth_route = request.url.path.startswith("/api/auth/")

    if not _check_rate_limit(client_ip, is_auth=is_auth_route):
        retry_msg = "Too many login attempts. Please wait a minute and try again." if is_auth_route else "Too many requests. Please slow down."
        return JSONResponse(
            status_code=429,
            content={"detail": retry_msg},
        )
    return await call_next(request)


# ─── Security Headers Middleware ───────────────────────────────────────────────
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


# ─── Global Exception Handler ──────────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log the error server-side but return a safe message to the client
    print(f"[ERROR] {request.method} {request.url} → {type(exc).__name__}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."},
    )


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router,          prefix=f"{settings.API_V1_STR}/auth",          tags=["Authentication"])
app.include_router(chat.router,          prefix=f"{settings.API_V1_STR}/chat",          tags=["Chat & Conversations"])
app.include_router(files.router,         prefix=f"{settings.API_V1_STR}/files",         tags=["Documents & Files"])
app.include_router(leads.router,         prefix=f"{settings.API_V1_STR}/leads",         tags=["Leads"])
app.include_router(subscriptions.router, prefix=f"{settings.API_V1_STR}/subscriptions", tags=["Subscriptions & Plans"])
app.include_router(business.router,      prefix=f"{settings.API_V1_STR}/business",      tags=["Business Portal"])
app.include_router(admin.router,         prefix=f"{settings.API_V1_STR}/admin",         tags=["Admin Control Panel"])
app.include_router(config_api.router,    prefix=f"{settings.API_V1_STR}/config",        tags=["AI Configuration"])

# Mount static uploads
_upload_dir = os.path.abspath(settings.UPLOAD_DIR)
os.makedirs(_upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_upload_dir), name="uploads")
app.mount("/api/files/static", StaticFiles(directory=_upload_dir), name="uploads-static")


# ─── Root & Health ────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
    }


@app.get("/health", include_in_schema=False)
async def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=True)
