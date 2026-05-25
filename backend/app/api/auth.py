"""Authentication — JWT-issuing OAuth2 password flow.

Bootstrap rules:
- The very first request to `/register` (when `users` is empty) is allowed
  publicly so a fresh deployment can create its admin account.
- Once any user exists, `/register` returns 403. New users from then on
  would be added by an existing admin (not yet implemented; not required
  for v1).
- `/setup-needed` lets the frontend decide whether to show the bootstrap
  form vs the regular login form.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.utils import log_action
from app.core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.database import get_db
from app.models.models import User
from app.schemas.schemas import Token, UserCreate, UserResponse, UserUpdate


router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

limiter = Limiter(key_func=get_remote_address)

# Tunable minimums. Mirrors what the frontend form enforces.
MIN_USERNAME = 3
MIN_PASSWORD = 8
MAX_USERNAME = 64
MAX_PASSWORD = 256


# ─────────────────────────────────────────────────────────────────────
# Dependencies
# ─────────────────────────────────────────────────────────────────────

def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: Optional[str] = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )
    return user


def check_admin(user: User = Depends(get_current_user)) -> User:
    """Ensure the user has the 'admin' role."""
    if user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrative privileges required for this action.",
        )
    return user


# ─────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────

class SetupStatus(BaseModel):
    needed: bool


@router.get("/setup-needed", response_model=SetupStatus)
def setup_needed(db: Session = Depends(get_db)) -> SetupStatus:
    """True only when no users exist yet — frontend uses this to switch
    between the bootstrap (Setup) form and the normal Login form."""
    return SetupStatus(needed=db.query(User).count() == 0)


@router.post("/register", response_model=UserResponse, status_code=201)
@limiter.limit("5/minute")
def register(request: Request, user: UserCreate, db: Session = Depends(get_db)):
    """Bootstrap-only: creates the first administrator. Once any user
    exists, subsequent calls are rejected — new admins must be created
    from within the studio by an already-authenticated user."""
    if db.query(User).count() > 0:
        raise HTTPException(
            status_code=403,
            detail="Registration is closed. An administrator already exists.",
        )

    username = (user.username or "").strip()
    if not username or len(username) < MIN_USERNAME or len(username) > MAX_USERNAME:
        raise HTTPException(
            status_code=400,
            detail=f"Username must be {MIN_USERNAME}–{MAX_USERNAME} characters.",
        )
    pwd = user.password or ""
    if len(pwd) < MIN_PASSWORD or len(pwd) > MAX_PASSWORD:
        raise HTTPException(
            status_code=400,
            detail=f"Password must be at least {MIN_PASSWORD} characters.",
        )

    db_user = User(
        username=username,
        hashed_password=get_password_hash(pwd),
        role="admin",
        isActive=True
    )
    db.add(db_user)
    
    log_action(db, username, "CREATE", "user", None, "Initial bootstrap admin created.")
    
    db.commit()
    db.refresh(db_user)
    return db_user


@router.post("/token", response_model=Token)
@limiter.limit("10/minute")
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2 password flow — form-encoded `username` + `password` body."""
    user = db.query(User).filter(User.username == form_data.username.strip()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated.",
        )

    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    
    log_action(db, user.username, "LOGIN", "auth", str(user.id))
    db.commit()
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    """Return the authenticated user — used by the frontend on mount to
    verify the stored token is still valid before rendering the studio."""
    return current_user


# ─── User Management (Admin Only) ───

@router.get("/users", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin)
):
    return db.query(User).all()


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin)
):
    # Check if username taken
    if db.query(User).filter(User.username == payload.username.strip()).first():
        raise HTTPException(status_code=400, detail="Username already taken.")
    
    db_user = User(
        username=payload.username.strip(),
        hashed_password=get_password_hash(payload.password),
        role=payload.role or "editor",
        isActive=True
    )
    db.add(db_user)
    
    log_action(
        db, admin.username, "CREATE", "user", payload.username,
        f"Created user with role: {db_user.role}"
    )
    
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/users/{uid}", response_model=UserResponse)
def update_user(
    uid: int,
    patch: UserUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin)
):
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    # Don't allow self-deactivation of the last admin
    if patch.isActive is False and user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself.")

    data = patch.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        data["hashed_password"] = get_password_hash(data.pop("password"))
    
    for k, v in data.items():
        setattr(user, k, v)
    
    log_action(db, admin.username, "UPDATE", "user", user.username, f"Updated fields: {list(data.keys())}")
    
    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{uid}")
def delete_user(
    uid: int,
    db: Session = Depends(get_db),
    admin: User = Depends(check_admin)
):
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself.")
    
    log_action(db, admin.username, "DELETE", "user", user.username)
    
    db.delete(user)
    db.commit()
    return {"success": True}
