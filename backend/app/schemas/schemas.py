from pydantic import BaseModel, ConfigDict
from typing import List, Optional


class UserCreate(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class ConfigItem(BaseModel):
    key: str
    value: str


class WineBase(BaseModel):
    name: str
    slug: Optional[str] = None
    vintage: Optional[str] = None
    varietal: Optional[str] = None
    region: Optional[str] = None
    alcohol: Optional[str] = None
    description: Optional[str] = None
    tastingNotes: Optional[str] = None
    foodPairing: Optional[str] = None
    price: Optional[float] = 0.0
    status: Optional[str] = "available"
    image: Optional[str] = None
    labelImage: Optional[str] = None
    images: Optional[List[str]] = None
    order: Optional[int] = 0


class WineCreate(WineBase):
    pass


class WineUpdate(BaseModel):
    """All fields optional — supports partial PATCH-style updates over PUT."""
    name: Optional[str] = None
    slug: Optional[str] = None
    vintage: Optional[str] = None
    varietal: Optional[str] = None
    region: Optional[str] = None
    alcohol: Optional[str] = None
    description: Optional[str] = None
    tastingNotes: Optional[str] = None
    foodPairing: Optional[str] = None
    price: Optional[float] = None
    status: Optional[str] = None
    image: Optional[str] = None
    labelImage: Optional[str] = None
    images: Optional[List[str]] = None
    order: Optional[int] = None


class WineResponse(WineBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ---------- Menu items ----------

class MenuItemBase(BaseModel):
    label: str
    kind: Optional[str] = "anchor"        # anchor | page | external
    target: Optional[str] = ""
    parent_id: Optional[int] = None
    order: Optional[int] = 0
    isVisible: Optional[bool] = True
    pageEyebrow: Optional[str] = None
    pageHeading: Optional[str] = None
    pageBody: Optional[str] = None
    pageImage: Optional[str] = None


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    label: Optional[str] = None
    kind: Optional[str] = None
    target: Optional[str] = None
    parent_id: Optional[int] = None
    order: Optional[int] = None
    isVisible: Optional[bool] = None
    pageEyebrow: Optional[str] = None
    pageHeading: Optional[str] = None
    pageBody: Optional[str] = None
    pageImage: Optional[str] = None


class MenuItemResponse(MenuItemBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class MenuItemNode(MenuItemResponse):
    """A top-level menu item augmented with its children. The frontend
    consumes this nested representation directly from GET /api/menu."""
    children: List["MenuItemResponse"] = []


class ReorderEntry(BaseModel):
    id: int
    parent_id: Optional[int] = None
    order: int


class ReorderRequest(BaseModel):
    items: List[ReorderEntry]


# ---------- Reservations ----------

class ReservationCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    party_size: Optional[int] = 2
    visit_date: str   # YYYY-MM-DD
    visit_time: str   # HH:MM
    message: Optional[str] = None


class ReservationUpdate(BaseModel):
    status: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    party_size: Optional[int] = None
    visit_date: Optional[str] = None
    visit_time: Optional[str] = None
    message: Optional[str] = None


class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None


class TemplateCreate(TemplateBase):
    """`payload` is required on create — either supplied by client (custom)
    or generated server-side from the current config (via the dedicated
    /from-current endpoint)."""
    payload: dict


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    payload: Optional[dict] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    payload: dict
    createdAt: str
    updatedAt: str
    model_config = ConfigDict(from_attributes=True)


class SubscriberCreate(BaseModel):
    email: str
    name: Optional[str] = None
    source: Optional[str] = "club"


class SubscriberResponse(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    subscribed: bool
    source: Optional[str] = None
    createdAt: str
    model_config = ConfigDict(from_attributes=True)


class ReservationResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    party_size: Optional[int] = 2
    visit_date: str
    visit_time: str
    message: Optional[str] = None
    status: str
    createdAt: str
    model_config = ConfigDict(from_attributes=True)
