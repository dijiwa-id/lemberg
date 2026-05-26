"""Lightweight dev migrations — adds columns missing from older databases.

This avoids forcing developers to nuke cms.db when models grow.
"""

import logging
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

logger = logging.getLogger("lemberg.migrate")

WINE_COLUMNS = {
    "slug":         "VARCHAR",
    "varietal":     "VARCHAR",
    "region":       "VARCHAR",
    "category":     "VARCHAR",      # replaced alcohol in the studio form (filterable on landing)
    "tastingNotes": "TEXT",
    "foodPairing":  "VARCHAR",
    "bottleCount":  "VARCHAR",
    "alcoholPercentage": "VARCHAR",
    "price":        "FLOAT DEFAULT 0",
    "status":       "VARCHAR DEFAULT 'available'",
    "labelImage":   "VARCHAR",
    "heroImage":    "VARCHAR",
    "heroImagePosition": "VARCHAR DEFAULT 'center'",
    "overlayOpacity": "FLOAT DEFAULT 0",
    "enableReflection": "BOOLEAN DEFAULT 0",
    "enableBlurEffect": "BOOLEAN DEFAULT 0",
    # Editorial gallery (JSON array of URLs). SQLite stores JSON as TEXT.
    "images":       "JSON",
    "stock":        "INTEGER DEFAULT 0",
}

RESERVATION_COLUMNS = {
    "event_type":   "VARCHAR",
}

USER_COLUMNS = {
    "role":     "VARCHAR DEFAULT 'admin'",
    "isActive": "BOOLEAN DEFAULT 1",
}

WINE_ORDER_COLUMNS = {
    "address": "TEXT",
    "items":   "JSON",
}


def _ensure_columns(engine: Engine, table: str, cols: dict[str, str]) -> None:
    try:
        inspector = inspect(engine)
        if table not in inspector.get_table_names():
            logger.debug("Table %s not found, skipping column check.", table)
            return
        
        existing = {c["name"] for c in inspector.get_columns(table)}
        with engine.begin() as conn:
            for col, ddl in cols.items():
                if col not in existing:
                    logger.info("Adding missing column %s.%s", table, col)
                    # SQLite supports simple ADD COLUMN ALTER
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN "{col}" {ddl}'))
    except Exception as e:
        logger.error("Failed to ensure columns for table %s: %s", table, e)


def add_missing_columns(engine: Engine) -> None:
    """Idempotent — safe to call on every boot. Adds any model columns
    that aren't present on the live SQLite file yet."""
    logger.info("Checking for missing database columns...")
    _ensure_columns(engine, "wines", WINE_COLUMNS)
    _ensure_columns(engine, "reservations", RESERVATION_COLUMNS)
    _ensure_columns(engine, "users", USER_COLUMNS)
    _ensure_columns(engine, "wine_orders", WINE_ORDER_COLUMNS)
    logger.info("Database column check complete.")
