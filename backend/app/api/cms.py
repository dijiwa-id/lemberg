import logging
import os
import re
import shutil
import uuid
from typing import Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models.models import Config, User, Wine
from app.schemas.schemas import WineCreate, WineResponse, WineUpdate

logger = logging.getLogger("lemberg.cms")

router = APIRouter()
UPLOAD_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- Config ---
@router.get("/config", response_model=Dict[str, str])
def read_config(db: Session = Depends(get_db)):
    configs = db.query(Config).all()
    return {c.key: (c.value or "") for c in configs}


# Hard cap on individual config values — prevents memory/disk abuse.
CONFIG_KEY_MAX = 64
CONFIG_VALUE_MAX = 8000


@router.put("/config")
def update_config(
    config_data: dict,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    if not isinstance(config_data, dict):
        raise HTTPException(status_code=400, detail="Body must be a JSON object.")

    for key, value in config_data.items():
        if not isinstance(key, str) or len(key) > CONFIG_KEY_MAX:
            raise HTTPException(
                status_code=400,
                detail=f"Config key must be a string ≤ {CONFIG_KEY_MAX} chars.",
            )
        coerced = "" if value is None else str(value)
        if len(coerced) > CONFIG_VALUE_MAX:
            raise HTTPException(
                status_code=400,
                detail=f"Config value for '{key}' exceeds {CONFIG_VALUE_MAX} chars.",
            )

        db_config = db.query(Config).filter(Config.key == key).first()
        if db_config:
            db_config.value = coerced
        else:
            db.add(Config(key=key, value=coerced))
    db.commit()
    return config_data


# --- Wines ---
@router.get("/wines", response_model=List[WineResponse])
def read_wines(db: Session = Depends(get_db)):
    return db.query(Wine).order_by(Wine.order).all()


@router.post("/wines", response_model=WineResponse)
def create_wine(
    wine: WineCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    db_wine = Wine(**wine.model_dump(exclude_unset=False))
    db.add(db_wine)
    db.commit()
    db.refresh(db_wine)
    return db_wine


@router.put("/wines/{wine_id}", response_model=WineResponse)
def update_wine(
    wine_id: int,
    wine: WineUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    db_wine = db.query(Wine).filter(Wine.id == wine_id).first()
    if not db_wine:
        raise HTTPException(status_code=404, detail="Wine not found")
    for key, value in wine.model_dump(exclude_unset=True).items():
        setattr(db_wine, key, value)
    db.commit()
    db.refresh(db_wine)
    return db_wine


@router.delete("/wines/{wine_id}")
def delete_wine(
    wine_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    db_wine = db.query(Wine).filter(Wine.id == wine_id).first()
    if not db_wine:
        raise HTTPException(status_code=404, detail="Wine not found")
    db.delete(db_wine)
    db.commit()
    return {"success": True}


# --- Uploads ----------------------------------------------------------------
# Limits and allow-lists. Defaults are conservative; override via env.
UPLOAD_MAX_BYTES = int(os.environ.get("LEMBERG_UPLOAD_MAX_BYTES", 20 * 1024 * 1024))
ALLOWED_MIME = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
    "image/avif",
}
ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif"}

# Reject filenames that try to escape the upload directory or contain control
# characters. Keep alphanumerics, dot, dash, underscore.
FILENAME_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _sanitize_filename(raw: str | None) -> str:
    """Return a safe basename derived from `raw`. Never contains slashes or
    path separators. Strips leading dots so it can't be a hidden file."""
    name = os.path.basename(raw or "image").strip()
    name = FILENAME_RE.sub("_", name).lstrip(".")
    if not name:
        name = "image"
    # Always re-derive the extension from the cleaned name (lowered).
    base, ext = os.path.splitext(name)
    return f"{base[:80]}{ext.lower()[:10]}"


@router.post("/upload")
def upload_file(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_user),
):
    """Accepts a single image file, persists it under /uploads, returns the URL.

    Validations:
    - MIME must be in ALLOWED_MIME
    - Extension must be in ALLOWED_EXT (defence in depth — MIME can be spoofed)
    - File must not exceed UPLOAD_MAX_BYTES (env-tunable, default 20 MB)
    - Filename is sanitised; never trusts the client-supplied path
    """
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Allowed: images only.",
        )

    safe = _sanitize_filename(file.filename)
    _, ext = os.path.splitext(safe)
    if ext.lower() not in ALLOWED_EXT:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file extension: {ext or '<none>'}.",
        )

    filename = f"{uuid.uuid4().hex[:10]}_{safe}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Final safety net — verify the resolved path is still inside UPLOAD_DIR.
    if os.path.commonpath([os.path.abspath(filepath), UPLOAD_DIR]) != UPLOAD_DIR:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    written = 0
    try:
        with open(filepath, "wb") as buffer:
            while chunk := file.file.read(1024 * 1024):  # 1 MB chunks — bounded memory
                written += len(chunk)
                if written > UPLOAD_MAX_BYTES:
                    buffer.close()
                    os.remove(filepath)
                    raise HTTPException(
                        status_code=413,
                        detail=(
                            f"File exceeds maximum size of "
                            f"{UPLOAD_MAX_BYTES // (1024 * 1024)} MB."
                        ),
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except OSError as e:
        logger.exception("Failed to write upload %s: %s", filename, e)
        # Best-effort cleanup if a partial file was written.
        try:
            os.remove(filepath)
        except OSError:
            pass
        raise HTTPException(status_code=500, detail="Could not save the upload.")
    finally:
        file.file.close()

    return {"url": f"/uploads/{filename}", "bytes": written}
