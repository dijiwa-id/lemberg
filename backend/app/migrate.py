"""Lightweight dev migrations — adds columns missing from older databases.

This avoids forcing developers to nuke cms.db when the Wine model grows.
"""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


WINE_COLUMNS = {
    "slug":         "VARCHAR",
    "varietal":     "VARCHAR",
    "region":       "VARCHAR",
    "alcohol":      "VARCHAR",
    "tastingNotes": "TEXT",
    "foodPairing":  "VARCHAR",
    "price":        "FLOAT DEFAULT 0",
    "status":       "VARCHAR DEFAULT 'available'",
    "labelImage":   "VARCHAR",
    # Editorial gallery (JSON array of URLs). SQLite stores JSON as TEXT.
    "images":       "JSON",
}


def add_missing_columns(engine: Engine) -> None:
    inspector = inspect(engine)
    if "wines" not in inspector.get_table_names():
        return
    existing = {c["name"] for c in inspector.get_columns("wines")}

    with engine.begin() as conn:
        for col, ddl in WINE_COLUMNS.items():
            if col not in existing:
                # SQLite supports simple ADD COLUMN ALTER
                conn.execute(text(f'ALTER TABLE wines ADD COLUMN "{col}" {ddl}'))
