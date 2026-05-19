"""SQLAlchemy engine + session factory.

Defaults to SQLite for zero-config local dev. In production set
`LEMBERG_DATABASE_URL` to a Postgres URL (e.g.
`postgresql+psycopg://user:pass@host/db`) — no other code change required.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DEFAULT_SQLITE_URL = "sqlite:///./cms.db"
SQLALCHEMY_DATABASE_URL = os.environ.get(
    "LEMBERG_DATABASE_URL", DEFAULT_SQLITE_URL
).strip() or DEFAULT_SQLITE_URL

# SQLite needs check_same_thread=False so the same connection can be used
# across FastAPI's worker thread pool. Other backends don't take that flag.
connect_args = (
    {"check_same_thread": False}
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    else {}
)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,  # auto-recycle stale connections (matters for Postgres)
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
