"""Lightweight dev migrations — adds columns missing from older databases.

This avoids forcing developers to nuke cms.db when models grow.
"""

import json
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


def _migrate_obsolete_data(engine: Engine) -> None:
    """Strategic migration: moves data from deprecated columns to modern ones."""
    inspector = inspect(engine)
    if "wines" not in inspector.get_table_names():
        return
    
    with engine.begin() as conn:
        wines = conn.execute(text("SELECT id, alcohol, category, image, images FROM wines")).fetchall()
        for w in wines:
            # 1. Migrate deprecated 'alcohol' to 'category' if category is empty
            update_sql = []
            params = {"id": w.id}
            
            if w.alcohol and not w.category:
                update_sql.append("category = :alcohol")
                params["alcohol"] = w.alcohol
                
            # 2. Migrate legacy 'image' into 'images' JSON array if images is empty
            if w.image and (not w.images or w.images == "[]" or w.images == "null"):
                try:
                    current_images = json.loads(w.images) if w.images else []
                except:
                    current_images = []
                    
                if not current_images:
                    update_sql.append("images = :images")
                    params["images"] = json.dumps([w.image])
            
            if update_sql:
                set_clause = ", ".join(update_sql)
                conn.execute(text(f"UPDATE wines SET {set_clause} WHERE id = :id"), params)


def add_missing_columns(engine: Engine) -> None:
    """Idempotent — safe to call on every boot. Adds any model columns
    that aren't present on the live SQLite file yet."""
    _ensure_columns(engine, "wines", WINE_COLUMNS)
    _ensure_columns(engine, "reservations", RESERVATION_COLUMNS)
    _migrate_obsolete_data(engine)
