"""Public reservation form + admin triage."""

from datetime import datetime, timezone
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.auth import get_current_user
from app.database import get_db
from app.models.models import Reservation, User
from app.schemas.schemas import (
    ReservationCreate,
    ReservationResponse,
    ReservationUpdate,
)


router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
TIME_RE = re.compile(r"^\d{2}:\d{2}$")
VALID_STATUSES = {"new", "confirmed", "cancelled"}


def _validate_payload(payload: ReservationCreate) -> None:
    if not payload.name or len(payload.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name is required.")
    if not EMAIL_RE.match((payload.email or "").strip()):
        raise HTTPException(status_code=400, detail="A valid email is required.")
    if not DATE_RE.match(payload.visit_date or ""):
        raise HTTPException(status_code=400, detail="Visit date must be YYYY-MM-DD.")
    if not TIME_RE.match(payload.visit_time or ""):
        raise HTTPException(status_code=400, detail="Visit time must be HH:MM.")
    size = payload.party_size or 0
    if size < 1 or size > 12:
        raise HTTPException(
            status_code=400, detail="Party size must be between 1 and 12."
        )
    # Day-of-week guard — estate is open Tue–Sat. Reject Sun (6) / Mon (0).
    try:
        d = datetime.strptime(payload.visit_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Visit date is not a real date.")
    if d.weekday() in (0, 6):  # Monday=0, Sunday=6
        raise HTTPException(
            status_code=400,
            detail="The estate is closed Sun–Mon. Please choose Tue–Sat.",
        )
    if d < datetime.now(timezone.utc).date():
        raise HTTPException(status_code=400, detail="Visit date cannot be in the past.")


@router.post("/reservations", response_model=ReservationResponse)
@limiter.limit("5/minute")
def create_reservation(request: Request, payload: ReservationCreate, db: Session = Depends(get_db)):
    _validate_payload(payload)
    row = Reservation(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        phone=(payload.phone or "").strip() or None,
        party_size=payload.party_size or 2,
        visit_date=payload.visit_date,
        visit_time=payload.visit_time,
        message=(payload.message or "").strip() or None,
        status="new",
        createdAt=datetime.now(timezone.utc).isoformat(timespec="seconds"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/reservations", response_model=List[ReservationResponse])
def list_reservations(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = db.query(Reservation)
    if status:
        q = q.filter(Reservation.status == status)
    return q.order_by(Reservation.id.desc()).all()


@router.put("/reservations/{rid}", response_model=ReservationResponse)
def update_reservation(
    rid: int,
    patch: ReservationUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    row = db.query(Reservation).filter(Reservation.id == rid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Reservation not found")
    data = patch.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/reservations/{rid}")
def delete_reservation(
    rid: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    row = db.query(Reservation).filter(Reservation.id == rid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Reservation not found")
    db.delete(row)
    db.commit()
    return {"success": True}
