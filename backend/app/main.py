import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api import auth, cms, menu, reservations, subscribers, templates, audit
from app.api.cms import UPLOAD_DIR
from app.database import Base, SessionLocal, engine
from app.migrate import add_missing_columns
from app.seed import seed_defaults

# ── Logging ─────────────────────────────────────────────────────────────
logging.basicConfig(
    level=os.environ.get("LEMBERG_LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)-7s %(name)s :: %(message)s",
)
logger = logging.getLogger("lemberg")

# ── Schema bootstrap ────────────────────────────────────────────────────
# `create_all` is idempotent — it creates tables that don't exist yet.
# `add_missing_columns` handles a small set of additive Wine-table changes
# without a full migration tool.
Base.metadata.create_all(bind=engine)
add_missing_columns(engine)

# ── Rate Limiting ───────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)


# ── Lifespan (replaces deprecated @on_event) ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        seed_defaults(db)
        logger.info("seed_defaults completed.")
    except Exception as e:
        logger.exception("seed_defaults failed: %s", e)
    finally:
        db.close()
    yield
    # No teardown work needed — SQLAlchemy engine is process-lifetime.


APP_VERSION = os.environ.get("LEMBERG_VERSION", "1.5.0")

# OpenAPI / Swagger docs are useful for development but leak the full
# request schema (every field, every validation rule) when left open in
# production. Default off in production-ish env (anything other than
# "true"/"1"); flip LEMBERG_DOCS_ENABLED=true to expose /docs again.
_docs_enabled = os.environ.get("LEMBERG_DOCS_ENABLED", "true").lower() in {"true", "1", "yes", "on"}

app = FastAPI(
    title="Lemberg Winery CMS API",
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
    openapi_url="/openapi.json" if _docs_enabled else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── CORS ────────────────────────────────────────────────────────────────
# Production deployments MUST set LEMBERG_CORS_ORIGINS to a comma-separated
# allow-list (e.g. "https://lemberg.example.com,https://www.lemberg.example.com").
# The default "*" is convenient for local dev only.
_raw_origins = os.environ.get("LEMBERG_CORS_ORIGINS", "*").strip()
if _raw_origins == "*":
    cors_origins = ["*"]
    cors_credentials = False  # browsers reject credentials + wildcard origin
    logger.warning(
        "CORS allows all origins. Set LEMBERG_CORS_ORIGINS for production."
    )
else:
    cors_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
    cors_credentials = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)


# ── Security Headers ────────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    # Basic CSP - restrict where assets can be loaded from
    csp = (
        "default-src 'self'; "
        "img-src 'self' data: https://images.unsplash.com; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "script-src 'self'; "
        "connect-src 'self';"
    )
    response.headers["Content-Security-Policy"] = csp
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# ── Request timing log ──────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    # Skip noisy health-checks
    if request.url.path != "/api/health":
        logger.info(
            "%s %s -> %s (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
    response.headers["X-Response-Time-ms"] = f"{elapsed_ms:.1f}"
    return response


# ── Routes ──────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(cms.router, prefix="/api", tags=["cms"])
app.include_router(menu.router, prefix="/api", tags=["menu"])
app.include_router(reservations.router, prefix="/api", tags=["reservations"])
app.include_router(subscribers.router, prefix="/api", tags=["subscribers"])
app.include_router(templates.router, prefix="/api", tags=["templates"])
app.include_router(audit.router, prefix="/api", tags=["audit"])

# Serve uploaded images at /uploads/* — consumed by the frontend asset resolver.
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def read_root():
    payload = {
        "name": "Lemberg Winery CMS API",
        "version": APP_VERSION,
    }
    if _docs_enabled:
        payload["docs"] = "/docs"
    return payload


@app.get("/api/health")
def health():
    return {"ok": True, "version": APP_VERSION}


@app.get("/api/version")
def version():
    return {"version": APP_VERSION}
