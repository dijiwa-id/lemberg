from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, JSON
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="admin")  # admin | editor
    isActive = Column(Boolean, default=True)


class AuditLog(Base):
    """Audit trail for administrative actions. Records who did what, when,
    and on which entity. Details can store a JSON snapshot of the change
    or relevant context."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(String, nullable=False, index=True)  # ISO 8601 UTC
    username = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False, index=True)    # CREATE | UPDATE | DELETE | LOGIN
    target_type = Column(String, nullable=False, index=True) # wine | config | menu | template ...
    target_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)


class Config(Base):
    __tablename__ = "configs"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(Text)


class Wine(Base):
    __tablename__ = "wines"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    slug = Column(String, index=True, nullable=True)
    vintage = Column(String, nullable=True)
    varietal = Column(String, nullable=True)
    region = Column(String, nullable=True)
    # `category` is the high-level group editors use to filter on the
    # landing page (e.g. Red, White, Rosé, Sparkling, Reserve). Replaced
    # the `alcohol` field in the studio's wine form — alcohol stays on
    # the model as a deprecated column so existing data is preserved.
    category = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    # Use camelCase python attrs to match Pydantic field names — keeps
    # response serialization simple and frontend keys stable.
    tastingNotes = Column(Text, nullable=True)
    foodPairing = Column(String, nullable=True)
    bottleCount = Column(String, nullable=True)
    alcoholPercentage = Column(String, nullable=True)
    price = Column(Float, nullable=True, default=0.0)
    stock = Column(Integer, nullable=True)
    status = Column(String, nullable=True, default="available")
    labelImage = Column(String, nullable=True)
    
    # Cinematic hero settings per wine
    heroImage = Column(String, nullable=True)
    heroImagePosition = Column(String, nullable=True, default="center") # center | left | right
    overlayOpacity = Column(Float, nullable=True, default=0.0)
    enableReflection = Column(Boolean, nullable=True, default=False)
    enableBlurEffect = Column(Boolean, nullable=True, default=False)

    # Editorial gallery — list of image URLs. The first entry is the
    # "default" shown on the landing card / modal hero.
    # Stored as JSON so we can extend per-image metadata later.
    images = Column(JSON, nullable=True)
    order = Column(Integer, default=0)


class MenuItem(Base):
    """A header navigation entry. Self-referential so a top-level item can
    own submenu children. `kind` selects how clicking the item behaves on the
    landing page:

    - "anchor"   — smooth-scroll to a section (e.g. target="#collection")
    - "page"     — open a generated page at /page/{target} backed by
                   pageHeading / pageBody / pageImage fields below
    - "external" — open the target URL in a new tab
    """

    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    parent_id = Column(Integer, ForeignKey("menu_items.id"), nullable=True, index=True)
    label = Column(String, nullable=False)
    kind = Column(String, default="anchor")
    target = Column(String, default="")
    order = Column(Integer, default=0)
    isVisible = Column(Boolean, default=True)

    # Used when kind == "page" — rendered by DynamicPage on the landing.
    pageEyebrow = Column(String, nullable=True)
    pageHeading = Column(String, nullable=True)
    pageBody = Column(Text, nullable=True)
    pageImage = Column(String, nullable=True)


class Subscriber(Base):
    """Allocation-list signup from the public Club section. Email is unique
    so resubmitting the same address is idempotent."""

    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    subscribed = Column(Boolean, default=True)
    source = Column(String, nullable=True)  # which page/section signed them up
    createdAt = Column(String, nullable=False)


class Template(Base):
    """Saved snapshot of brand + theme + section-visibility config.
    Editors can save the current look as a named template and later "apply"
    it to swap the public site between presets (light/dark editorial, bold
    modern, minimal, seasonal, etc.) without re-editing each field. The
    payload is a small JSON subset of SiteConfig — only the visual identity
    fields, not page copy."""

    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    payload = Column(JSON, nullable=False)
    thumbnail = Column(String, nullable=True)
    createdAt = Column(String, nullable=False)
    updatedAt = Column(String, nullable=False)


class Reservation(Base):
    """A tasting / estate-visit booking request submitted via the public
    reservation form. `status` lets editors triage in the studio."""

    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    phone = Column(String, nullable=True)
    # Free-text event category — values come from the editor-configurable
    # `reservationEventTypes` list (Weddings, Corporate events, Wine tastings,
    # Private functions, Farm experiences, Hospitality events …). Nullable
    # because older reservations existed before the field was added.
    event_type = Column(String, nullable=True, index=True)
    party_size = Column(Integer, default=2)
    visit_date = Column(String, nullable=False, index=True)  # YYYY-MM-DD
    visit_time = Column(String, nullable=False)              # HH:MM
    message = Column(Text, nullable=True)
    status = Column(String, default="new", index=True)       # new | confirmed | cancelled
    createdAt = Column(String, nullable=False)               # ISO 8601 UTC
