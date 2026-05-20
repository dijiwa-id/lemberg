"""Lightweight dev migrations — adds columns missing from older databases.

This avoids forcing developers to nuke cms.db when models grow.
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


WINE_COLUMNS = {
    "slug":         "VARCHAR",
    "varietal":     "VARCHAR",
    "region":       "VARCHAR",
    "category":     "VARCHAR",      # replaced alcohol in the studio form (filterable on landing)
    "alcohol":      "VARCHAR",      # deprecated; data preserved for any deployment that had it
    "tastingNotes": "TEXT",
    "foodPairing":  "VARCHAR",
    "price":        "FLOAT DEFAULT 0",
    "status":       "VARCHAR DEFAULT 'available'",
    "labelImage":   "VARCHAR",
    # Editorial gallery (JSON array of URLs). SQLite stores JSON as TEXT.
    "images":       "JSON",
}

RESERVATION_COLUMNS = {
    # Event inquiry category — see `reservationEventTypes` config for the
    # editor-controlled list of allowed values. Nullable because rows that
    # existed before this column was added don't have it.
    "event_type":   "VARCHAR",
}


def _ensure_columns(engine: Engine, table: str, cols: dict[str, str]) -> None:
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns(table)}
    with engine.begin() as conn:
        for col, ddl in cols.items():
            if col not in existing:
                # SQLite supports simple ADD COLUMN ALTER
                conn.execute(text(f'ALTER TABLE {table} ADD COLUMN "{col}" {ddl}'))


def add_missing_columns(engine: Engine) -> None:
    """Idempotent — safe to call on every boot. Adds any model columns
    that aren't present on the live SQLite file yet."""
    _ensure_columns(engine, "wines", WINE_COLUMNS)
    _ensure_columns(engine, "reservations", RESERVATION_COLUMNS)
