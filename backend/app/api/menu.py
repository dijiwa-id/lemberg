"""Header-menu CRUD.

Menu items form a one-level tree (top-level + children). The public landing
page reads the tree from `GET /api/menu`; the studio mutates it via the
remaining endpoints. Deleting a parent cascades to its children.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.database import get_db
from app.models.models import MenuItem, User
from app.schemas.schemas import (
    MenuItemCreate,
    MenuItemNode,
    MenuItemResponse,
    MenuItemUpdate,
    ReorderRequest,
)


router = APIRouter()

VALID_KINDS = {"anchor", "page", "external"}


def _validate_kind(kind: Optional[str]) -> str:
    k = (kind or "anchor").lower()
    if k not in VALID_KINDS:
        raise HTTPException(
            status_code=400,
            detail=f"kind must be one of: {', '.join(sorted(VALID_KINDS))}",
        )
    return k


@router.get("/menu", response_model=List[MenuItemNode])
def read_menu_tree(db: Session = Depends(get_db)):
    """Return menu items as a nested tree (top-level → children)."""
    all_items = db.query(MenuItem).order_by(MenuItem.order, MenuItem.id).all()
    by_parent: dict[Optional[int], List[MenuItem]] = {}
    for it in all_items:
        by_parent.setdefault(it.parent_id, []).append(it)

    nodes: List[MenuItemNode] = []
    for top in by_parent.get(None, []):
        nodes.append(
            MenuItemNode(
                **MenuItemResponse.model_validate(top).model_dump(),
                children=[
                    MenuItemResponse.model_validate(c)
                    for c in by_parent.get(top.id, [])
                ],
            )
        )
    return nodes


@router.get("/menu/by-slug/{slug}", response_model=MenuItemResponse)
def read_menu_by_slug(slug: str, db: Session = Depends(get_db)):
    """Lookup by `target` for kind=page items (used by the dynamic page route)."""
    item = (
        db.query(MenuItem)
        .filter(MenuItem.kind == "page", MenuItem.target == slug)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Page not found")
    return item


@router.post("/menu", response_model=MenuItemResponse)
def create_menu_item(
    item: MenuItemCreate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    kind = _validate_kind(item.kind)

    # If no order was supplied, append within the parent / top level.
    order = item.order
    if order is None or order == 0:
        sibling_count = (
            db.query(MenuItem).filter(MenuItem.parent_id == item.parent_id).count()
        )
        order = sibling_count

    payload = item.model_dump(exclude_unset=False)
    payload["kind"] = kind
    payload["order"] = order

    db_item = MenuItem(**payload)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/menu/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    item_id: int,
    patch: MenuItemUpdate,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    data = patch.model_dump(exclude_unset=True)
    if "kind" in data:
        data["kind"] = _validate_kind(data["kind"])

    if "parent_id" in data and data["parent_id"] == item_id:
        raise HTTPException(status_code=400, detail="An item cannot be its own parent")

    for k, v in data.items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item


@router.put("/menu/reorder")
def reorder_menu(
    req: ReorderRequest,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Bulk reorder. Pass every affected item with its new (parent_id, order)."""
    ids = [e.id for e in req.items]
    rows = db.query(MenuItem).filter(MenuItem.id.in_(ids)).all()
    by_id = {r.id: r for r in rows}
    for entry in req.items:
        row = by_id.get(entry.id)
        if not row:
            continue
        if entry.parent_id == entry.id:
            continue  # silently ignore self-parenting
        row.parent_id = entry.parent_id
        row.order = entry.order
    db.commit()
    return {"success": True, "count": len(rows)}


@router.delete("/menu/{item_id}")
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    db_item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    # Cascade: drop children first so we don't leave orphans.
    db.query(MenuItem).filter(MenuItem.parent_id == item_id).delete()
    db.delete(db_item)
    db.commit()
    return {"success": True}
