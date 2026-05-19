"""Auth crypto + JWT signing.

Production deployments MUST set LEMBERG_SECRET_KEY to a strong random value
(e.g. `python -c "import secrets; print(secrets.token_urlsafe(64))"`).

In local dev a deterministic placeholder is used so the API boots without
configuration — but a warning is emitted on import so it's hard to miss.
"""

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext

logger = logging.getLogger("lemberg.security")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.environ.get("LEMBERG_ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

_DEV_PLACEHOLDER = "dev-only-secret-DO-NOT-USE-IN-PRODUCTION"

SECRET_KEY = os.environ.get("LEMBERG_SECRET_KEY", "").strip()
if not SECRET_KEY:
    SECRET_KEY = _DEV_PLACEHOLDER
    logger.warning(
        "LEMBERG_SECRET_KEY is not set — using insecure dev placeholder. "
        "Set this env var to a strong random value before deploying."
    )
elif SECRET_KEY == _DEV_PLACEHOLDER or len(SECRET_KEY) < 32:
    logger.warning(
        "LEMBERG_SECRET_KEY is set but looks weak (<32 chars). "
        "Generate a stronger value with `secrets.token_urlsafe(64)`."
    )


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def random_token(nbytes: int = 32) -> str:
    """Convenience for places that need a one-time token (e.g. password reset)."""
    return secrets.token_urlsafe(nbytes)
