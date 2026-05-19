"""Allocation-list subscribers — captured by the public Club form."""

from datetime import datetime, timezone
import re
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models.models import Subscriber, User
from app.schemas.schemas import SubscriberCreate, SubscriberResponse


router = APIRouter()

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


@router.post("/subscribers", response_model=SubscriberResponse)
def create_subscriber(payload: SubscriberCreate, db: Session = Depends(get_db)):
    """Idempotent — resubmitting the same email reactivates the existing
    record rather than creating a duplicate or rejecting."""
    email = (payload.email or "").strip().lower()
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="A valid email is required.")

    existing = db.query(Subscriber).filter(Subscriber.email == email).first()
    if existing:
        if not existing.subscribed:
            existing.subscribed = True
        if payload.name and not existing.name:
            existing.name = payload.name.strip()
        db.commit()
        db.refresh(existing)
        return existing

    row = Subscriber(
        email=email,
        name=(payload.name or "").strip() or None,
        source=(payload.source or "club").strip() or "club",
        subscribed=True,
        createdAt=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/subscribers", response_model=List[SubscriberResponse])
def list_subscribers(
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    return db.query(Subscriber).order_by(Subscriber.id.desc()).all()


@router.delete("/subscribers/{sid}")
def delete_subscriber(
    sid: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    row = db.query(Subscriber).filter(Subscriber.id == sid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    db.delete(row)
    db.commit()
    return {"success": True}
