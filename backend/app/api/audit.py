"""Audit Log API — viewing administrative activity."""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.auth import check_admin
from app.database import get_db
from app.models.models import AuditLog, User
from app.schemas.schemas import AuditLogResponse


router = APIRouter()


@router.get("/audit", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    username: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin),
):
    """View the audit trail. Strictly reserved for 'admin' role."""
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action)
    if target_type:
        q = q.filter(AuditLog.target_type == target_type)
    if username:
        q = q.filter(AuditLog.username == username)
    
    return q.order_by(AuditLog.id.desc()).limit(limit).all()
