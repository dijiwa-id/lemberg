import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import auth, cms, menu, reservations, subscribers, templates
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


APP_VERSION = os.environ.get("LEMBERG_VERSION", "1.1.0")

app = FastAPI(
    title="Lemberg Winery CMS API",
    version=APP_VERSION,
    lifespan=lifespan,
)


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

# Serve uploaded images at /uploads/* — consumed by the frontend asset resolver.
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def read_root():
    return {
        "name": "Lemberg Winery CMS API",
        "version": APP_VERSION,
        "docs": "/docs",
    }


@app.get("/api/health")
def health():
    return {"ok": True, "version": APP_VERSION}


@app.get("/api/version")
def version():
    return {"version": APP_VERSION}
