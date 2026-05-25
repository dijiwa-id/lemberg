from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import AuditLog

def log_action(
    db: Session,
    username: str,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
):
    """Helper to commit an audit log entry."""
    entry = AuditLog(
        timestamp=datetime.now(timezone.utc).isoformat(timespec="seconds"),
        username=username,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
    )
    db.add(entry)
    # We don't commit here — we assume the caller will commit their main
    # change and this entry along with it.
