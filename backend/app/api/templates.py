"""Theme template library — named snapshots of brand + theme + visibility
fields that editors can save and swap between.

Scope: ONLY the visual-identity / theme / section-visibility subset of
SiteConfig. Page copy (hero text, philosophy body, etc.) stays separate —
templates are about "the look", not "the content". This keeps templates
small (a few KB each) and prevents accidental copy overwrites when applying
a different visual style.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.utils import log_action
from app.api.auth import get_current_user
from app.database import get_db
from app.models.models import Config, Template, User
from app.schemas.schemas import (
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
)


# Hard cap on a single import bundle. Two orders of magnitude beyond any
# plausible legitimate use — protects the server from malformed or
# malicious files claiming to hold thousands of templates.
MAX_IMPORT_TEMPLATES = 100


class TemplateImportRequest(BaseModel):
    """Bundle import payload. The frontend normalises file shapes (bare
    array, single template object, full bundle) into this `{ templates: [] }`
    form before posting."""
    templates: List[Dict[str, Any]]


router = APIRouter()

# Which config keys are part of a template. Adding new keys here is safe —
# they'll start appearing in new snapshots; old templates simply won't have
# them and the field stays as-is on apply.
TEMPLATE_FIELDS = (
    "logoText",
    "logoImage",
    "logoFont",
    "landingTheme",
    "brandAccent",
    "navAnnouncement",
    "showAnnouncementBar",
    "showPhilosophy",
    "showVarietalRibbon",
    "ribbonFormat",
    "ribbonText",
    "ribbonImages",
    "showFeaturedWine",
    "showEstateBand",
    "showExperience",
    "showClub",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _validate_name(name: str) -> str:
    n = (name or "").strip()
    if not n or len(n) < 2:
        raise HTTPException(status_code=400, detail="Template name must be ≥ 2 characters.")
    if len(n) > 80:
        raise HTTPException(status_code=400, detail="Template name must be ≤ 80 characters.")
    return n


def _sanitize_payload(payload: Dict[str, str] | None) -> Dict[str, str]:
    """Keep only fields in TEMPLATE_FIELDS — anything else (page copy,
    SEO meta, footer details) is filtered out. Values coerced to string."""
    if not payload or not isinstance(payload, dict):
        return {}
    out: Dict[str, str] = {}
    for key in TEMPLATE_FIELDS:
        if key in payload and payload[key] is not None:
            out[key] = str(payload[key])
    return out


def _current_config_snapshot(db: Session) -> Dict[str, str]:
    """Pull TEMPLATE_FIELDS from the live `configs` table."""
    rows = (
        db.query(Config)
        .filter(Config.key.in_(TEMPLATE_FIELDS))
        .all()
    )
    return {r.key: (r.value or "") for r in rows}


def _unique_name(base: str, taken: set[str], suffix_word: str = "copy") -> str:
    """Return `base` if it's free, otherwise `base (suffix_word)`, then
    `base (suffix_word 2)`, etc. Case-insensitive comparison so "Spring"
    and "spring" collide. `taken` is mutated — caller decides whether to
    add the chosen name back before the next call (the bulk-import path
    needs that to avoid two imported entries colliding with each other)."""
    if base.lower() not in taken:
        return base
    i = 1
    while True:
        candidate = (
            f"{base} ({suffix_word})"
            if i == 1
            else f"{base} ({suffix_word} {i})"
        )
        if candidate.lower() not in taken:
            return candidate
        i += 1


# ─────────────────────────────────────────────────────────────────────


@router.get("/templates", response_model=List[TemplateResponse])
def list_templates(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Studio template library. Sorted newest-first."""
    return db.query(Template).order_by(Template.updatedAt.desc()).all()


@router.post("/templates", response_model=TemplateResponse, status_code=201)
def create_template(
    payload: TemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a template from a client-supplied payload (e.g. importing a
    template from elsewhere or building one programmatically). For the
    common case of "save current look", use POST /templates/from-current."""
    name = _validate_name(payload.name)
    body = _sanitize_payload(payload.payload)
    now = _now()
    row = Template(
        name=name,
        description=(payload.description or "").strip() or None,
        thumbnail=(payload.thumbnail or "").strip() or None,
        payload=body,
        createdAt=now,
        updatedAt=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    
    log_action(db, user.username, "CREATE", "template", str(row.id), f"Created template: {name}")
    db.commit()
    
    return row


@router.post("/templates/from-current", response_model=TemplateResponse, status_code=201)
def snapshot_current(
    payload: TemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Snapshot the LIVE config into a new template — the most common path.
    Client supplies name + description; server pulls TEMPLATE_FIELDS from
    the configs table and stores them as payload."""
    name = _validate_name(payload.name)
    body = _current_config_snapshot(db)
    now = _now()
    row = Template(
        name=name,
        description=(payload.description or "").strip() or None,
        thumbnail=(payload.thumbnail or "").strip() or None,
        payload=body,
        createdAt=now,
        updatedAt=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    
    log_action(db, user.username, "CREATE", "template", str(row.id), f"Snapshotted current look as: {name}")
    db.commit()
    
    return row


@router.put("/templates/{tid}", response_model=TemplateResponse)
def update_template(
    tid: int,
    patch: TemplateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rename, re-describe, or replace the payload of an existing template."""
    row = db.query(Template).filter(Template.id == tid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found.")

    if patch.name is not None:
        row.name = _validate_name(patch.name)
    if patch.description is not None:
        row.description = patch.description.strip() or None
    if patch.thumbnail is not None:
        row.thumbnail = patch.thumbnail.strip() or None
    if patch.payload is not None:
        row.payload = _sanitize_payload(patch.payload)

    row.updatedAt = _now()
    
    log_action(db, user.username, "UPDATE", "template", str(tid), f"Updated template: {row.name}")
    
    db.commit()
    db.refresh(row)
    return row


@router.post("/templates/{tid}/apply", response_model=Dict[str, str])
def apply_template(
    tid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Apply a template — copy its payload fields onto the live `configs`
    table, leaving non-template fields (page copy, SEO, footer) untouched.
    Also writes `activeTemplateId = str(tid)` so the studio's library can
    badge the row as "currently active". Returns the post-apply snapshot
    + active flag so the frontend can update its in-memory config without
    a separate roundtrip."""
    row = db.query(Template).filter(Template.id == tid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found.")

    body = _sanitize_payload(row.payload)
    if not body:
        raise HTTPException(status_code=400, detail="Template payload is empty.")

    # Persist payload + active marker in one transaction.
    write_set = dict(body)
    write_set["activeTemplateId"] = str(tid)

    for key, value in write_set.items():
        existing = db.query(Config).filter(Config.key == key).first()
        if existing:
            existing.value = value
        else:
            db.add(Config(key=key, value=value))
            
    log_action(db, user.username, "UPDATE", "template", str(tid), f"Applied template: {row.name}")
    
    db.commit()
    return write_set


@router.post("/templates/import", response_model=List[TemplateResponse], status_code=201)
def import_templates(
    payload: TemplateImportRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Bulk-import templates from an exported bundle.

    Each entry is sanitized through the TEMPLATE_FIELDS allowlist (so a
    malicious file can't sneak in unexpected config keys). Name conflicts
    are resolved by appending an `(imported)` suffix — editors never lose
    existing templates to an import. Returns the created rows in input
    order so the studio can highlight what was just added."""
    incoming = payload.templates or []
    if not incoming:
        raise HTTPException(status_code=400, detail="No templates in the import payload.")
    if len(incoming) > MAX_IMPORT_TEMPLATES:
        raise HTTPException(
            status_code=400,
            detail=f"Too many templates ({len(incoming)}). Max per import is {MAX_IMPORT_TEMPLATES}.",
        )

    taken = {t.name.lower() for t in db.query(Template).all()}
    now = _now()
    created: List[Template] = []

    for idx, raw in enumerate(incoming):
        if not isinstance(raw, dict):
            raise HTTPException(status_code=400, detail=f"Entry {idx + 1} is not a JSON object.")
        try:
            base_name = _validate_name(raw.get("name", ""))
        except HTTPException as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Entry {idx + 1}: {exc.detail}",
            ) from exc

        body = _sanitize_payload(raw.get("payload") or {})
        if not body:
            raise HTTPException(
                status_code=400,
                detail=f"Entry \"{base_name}\" has no recognised template fields.",
            )

        name = _unique_name(base_name, taken, suffix_word="imported")
        taken.add(name.lower())

        desc_raw = raw.get("description")
        description = desc_raw.strip() if isinstance(desc_raw, str) and desc_raw.strip() else None
        thumb_raw = raw.get("thumbnail")
        thumbnail = thumb_raw.strip() if isinstance(thumb_raw, str) and thumb_raw.strip() else None

        row = Template(
            name=name,
            description=description,
            thumbnail=thumbnail,
            payload=body,
            createdAt=now,
            updatedAt=now,
        )
        db.add(row)
        created.append(row)

    log_action(db, user.username, "CREATE", "template", "bulk-import", f"Imported {len(created)} templates.")
    
    db.commit()
    for row in created:
        db.refresh(row)
    return created


@router.post("/templates/{tid}/duplicate", response_model=TemplateResponse, status_code=201)
def duplicate_template(
    tid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Clone an existing template under a "(copy)" suffix. Useful when an
    editor wants to fork a template before tweaking — keeps the original
    intact, lets them rename the copy and experiment freely."""
    src = db.query(Template).filter(Template.id == tid).first()
    if not src:
        raise HTTPException(status_code=404, detail="Template not found.")

    taken = {t.name.lower() for t in db.query(Template).all()}
    name = _unique_name(src.name, taken, suffix_word="copy")

    now = _now()
    row = Template(
        name=name,
        description=src.description,
        thumbnail=src.thumbnail,
        payload=dict(src.payload or {}),  # defensive copy — JSON column
        createdAt=now,
        updatedAt=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    
    log_action(db, user.username, "CREATE", "template", str(row.id), f"Duplicated template {tid} as: {name}")
    db.commit()
    
    return row


@router.delete("/templates/{tid}")
def delete_template(
    tid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(Template).filter(Template.id == tid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found.")

    name = row.name
    # If this was the active template, clear the marker so the studio
    # doesn't end up pointing at a deleted row.
    was_active = False
    active_cfg = (
        db.query(Config).filter(Config.key == "activeTemplateId").first()
    )
    if active_cfg and active_cfg.value == str(tid):
        active_cfg.value = ""
        was_active = True

    db.delete(row)
    
    log_action(db, user.username, "DELETE", "template", str(tid), f"Deleted template: {name}")
    
    db.commit()
    return {"success": True, "wasActive": was_active}
