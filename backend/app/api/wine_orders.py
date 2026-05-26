"""Public wine order form + admin triage."""

from datetime import datetime, timezone
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.utils import log_action
from app.api.auth import get_current_user
from app.database import get_db
from app.models.models import WineOrder, User, Wine
from app.core.email import send_order_notification
from app.schemas.schemas import (
    WineOrderCreate,
    WineOrderResponse,
    WineOrderUpdate,
)


router = APIRouter()

limiter = Limiter(key_func=get_remote_address)

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
VALID_STATUSES = {"new", "processing", "contacted", "completed", "cancelled"}


def _validate_payload(payload: WineOrderCreate, db: Session) -> None:
    if not payload.customer_name or len(payload.customer_name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not EMAIL_RE.match((payload.email or "").strip()):
        raise HTTPException(status_code=400, detail="A valid email is required.")
    if not payload.phone_number or len(payload.phone_number.strip()) < 5:
        raise HTTPException(status_code=400, detail="A valid phone number is required.")
    if not payload.address or len(payload.address.strip()) < 5:
        raise HTTPException(status_code=400, detail="A valid address is required.")
    
    # If items are provided (Shopping Cart flow)
    if payload.items:
        for item in payload.items:
            wine = db.query(Wine).filter(Wine.id == item.wine_id).first()
            if not wine:
                raise HTTPException(status_code=400, detail=f"Wine '{item.name}' does not exist.")
            if item.quantity < 1:
                raise HTTPException(status_code=400, detail="Quantity must be at least 1.")
    # Fallback to single wine_product_id (Legacy or simple direct order)
    elif payload.wine_product_id:
        if payload.quantity < 1:
            raise HTTPException(status_code=400, detail="Quantity must be at least 1.")
        wine = db.query(Wine).filter(Wine.id == payload.wine_product_id).first()
        if not wine:
            raise HTTPException(status_code=400, detail="Selected wine product does not exist.")
    else:
        raise HTTPException(status_code=400, detail="At least one item or wine product is required.")


@router.post("/wine-orders", response_model=WineOrderResponse)
@limiter.limit("5/minute")
def create_wine_order(request: Request, payload: WineOrderCreate, db: Session = Depends(get_db)):
    _validate_payload(payload, db)
    
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    
    # Convert items to dict for JSON storage
    items_data = None
    primary_wine_id = payload.wine_product_id
    total_qty = payload.quantity

    if payload.items:
        items_data = [item.model_dump() for item in payload.items]
        # Satisfy legacy SQLite NOT NULL constraint without dropping the table
        if not primary_wine_id and len(payload.items) > 0:
            primary_wine_id = payload.items[0].wine_id
            total_qty = sum(item.quantity for item in payload.items)

    row = WineOrder(
        customer_name=payload.customer_name.strip(),
        email=payload.email.strip().lower(),
        phone_number=payload.phone_number.strip(),
        address=payload.address.strip(),
        wine_product_id=primary_wine_id,
        quantity=total_qty,
        items=items_data,
        notes=(payload.notes or "").strip() or None,
        source_page=(payload.source_page or "").strip() or None,
        status="new",
        createdAt=now,
        updatedAt=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    
    # Bypassing automated email notification per user request.
    # The transaction is now recorded purely in the admin studio.
    
    return row


@router.get("/admin/wine-orders", response_model=List[WineOrderResponse])
def list_wine_orders(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(WineOrder)
    if status:
        q = q.filter(WineOrder.status == status)
    return q.order_by(WineOrder.id.desc()).all()


@router.get("/admin/wine-orders/{oid}", response_model=WineOrderResponse)
def get_wine_order(
    oid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(WineOrder).filter(WineOrder.id == oid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    return row


@router.patch("/admin/wine-orders/{oid}", response_model=WineOrderResponse)
def update_wine_order(
    oid: int,
    patch: WineOrderUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(WineOrder).filter(WineOrder.id == oid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    
    data = patch.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"status must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )
    
    for k, v in data.items():
        setattr(row, k, v)
    
    row.updatedAt = datetime.now(timezone.utc).isoformat(timespec="seconds")

    log_action(db, user.username, "UPDATE", "wine_order", str(oid), f"Updated fields: {list(data.keys())}")

    db.commit()
    db.refresh(row)
    return row


@router.delete("/admin/wine-orders/{oid}")
def delete_wine_order(
    oid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(WineOrder).filter(WineOrder.id == oid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")

    log_action(db, user.username, "DELETE", "wine_order", str(oid))

    db.delete(row)
    db.commit()
    return {"success": True}


@router.post("/admin/wine-orders/{oid}/notify")
def notify_wine_order(
    oid: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(WineOrder).filter(WineOrder.id == oid).first()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        email_items = []
        if row.items:
            email_items = row.items
        elif row.wine_product_id:
            wine = db.query(Wine).filter(Wine.id == row.wine_product_id).first()
            if wine:
                email_items = [{
                    "name": wine.name,
                    "vintage": wine.vintage,
                    "quantity": row.quantity,
                    "price": wine.price
                }]

        success = send_order_notification(
            order_id=row.id,
            customer_name=row.customer_name,
            customer_email=row.email,
            customer_phone=row.phone_number,
            address=row.address or "No address provided",
            items=email_items,
            notes=row.notes
        )
        
        if not success:
             raise HTTPException(status_code=500, detail="Failed to send notification via Resend.")
             
        log_action(db, user.username, "NOTIFY", "wine_order", str(oid))
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
