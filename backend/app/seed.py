"""Seed defaults for first boot — runs once when DB is empty."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.models.models import Config, MenuItem, Template, Wine


DEFAULT_CONFIG = {
    "logoText": "Lemberg",
    "logoImage": "",
    "logoFont": "Cormorant Garamond",
    "navAnnouncement": "Vintage 2024 — pre-allocation open",
    "heroEyebrow": "Tulbagh Valley · South Africa",
    "heroHeading": "Quiet wines, made\nwith patience and",
    "heroHeadingItalic": "extraordinary intent.",
    "heroSubheading": (
        "Hand-tended vineyards on a small family estate at the foot of the Witzenberg. "
        "Restrained winemaking. A single, unhurried release each season."
    ),
    "heroBackgroundImage": (
        "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb"
        "?w=2400&q=80&auto=format&fit=crop"
    ),
    "heroCta": "View the collection",

    "philosophyEyebrow": "The estate",
    "philosophyHeading": "Rooted in the soil.",
    "philosophyHeadingItalic": "Guided by the season.",
    "philosophyBody": (
        "Lemberg is one of the smallest wineries in the Cape, set on twelve hectares of "
        "decomposed shale and weathered granite. We farm without rush — pruning, picking, "
        "and pressing by hand — and let each vintage speak for itself in the cellar.\n\n"
        "Nothing is added that the vineyard did not give. Nothing is removed that the wine "
        "does not require."
    ),
    "philosophyImage": (
        "https://images.unsplash.com/photo-1506377585622-bedcbb027afc"
        "?w=1600&q=80&auto=format&fit=crop"
    ),
    "philosophyEstYear": "Est. 1978",

    "collectionEyebrow": "The collection",
    "collectionHeading": "Six wines.",
    "collectionItalic": "One season.",

    "featuredWineId": "",
    "featuredEyebrow": "Flagship release",
    "featuredHeading": "Lemberg Louis",
    "featuredSubtitle": "Flagship Bordeaux-style blend",
    "featuredBody": (
        "Our flagship Bordeaux-style red. Built on Cabernet Sauvignon from the home block, "
        "with parcels of Merlot and Cabernet Franc from older vines. Twenty-two months in "
        "French oak. A wine of slow conversations and longer evenings."
    ),
    # Featured wine — cinematic hero (Single image fallback)
    "featuredImage": "",
    "featuredHeroImagePosition": "center",
    "featuredOverlayOpacity": "0.1",
    "featuredEnableReflection": "true",
    "featuredEnableBlurEffect": "false",
    "featuredCtaPrimary": "Reserve a bottle",
    "featuredCtaSecondary": "Explore collection",
    "featuredSeoTitle": "Featured Release — Lemberg Winery",
    "featuredSeoDescription": "Discover our latest flagship release, handcrafted with quiet conviction.",

    "estateEyebrow": "The valley",
    "estateHeading": "Where the morning mist\nmeets the granite.",
    "estateBody": (
        "The Tulbagh basin sits ringed by three mountain ranges. Cold nights, hot days, "
        "and the constant breath of the Atlantic give our fruit the slow ripening it "
        "needs to keep its lift."
    ),
    "estateImage": (
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19"
        "?w=2400&q=80&auto=format&fit=crop"
    ),

    "experienceEyebrow": "Visit the estate",
    "experienceHeading": "Stay a while.",
    "experienceItalic": "Savour the depth.",
    "experienceBody": (
        "Private tastings by appointment, Tuesday to Saturday. Walk the home block at "
        "golden hour, share a flight of six in our cellar, and take home a bottle from the "
        "library."
    ),
    "experienceImage": (
        "https://images.unsplash.com/photo-1474722883778-792e7990302f"
        "?w=2400&q=80&auto=format&fit=crop"
    ),
    "experienceCta": "Book a tasting",
    "experienceCtaEmail": "",
    "experienceHours": "Tue–Fri · 10:00 — 16:00\nSat · 10:00 — 14:00",
    "experienceTasting": "6 wines · 75 min",
    "experienceBooking": "By appointment only",

    # ─── Reservation form copy + event taxonomy ───
    # Drives the public /reservation page wording AND the event-inquiry
    # dropdown options. Event types are newline-separated so editors can
    # add or remove entries from a single textarea — no JSON gymnastics.
    "reservationEyebrow": "Reserve a tasting",
    "reservationHeading": "Plan your visit",
    "reservationHeadingItalic": "to the estate.",
    "reservationBody": (
        "Private tastings by appointment, Tuesday to Saturday. Tell us "
        "who is joining and which afternoon suits — we'll write back "
        "within a working day to confirm."
    ),
    "reservationSuccessHeading": "Thank you — see you soon.",
    "reservationEventTypes": (
        "Weddings\n"
        "Corporate events\n"
        "Wine tastings\n"
        "Private functions\n"
        "Farm experiences\n"
        "Hospitality events"
    ),

    "clubEyebrow": "Allocation list",
    "clubHeading": "Join the club.",
    "clubBody": (
        "A short note from the cellar each season, first access to library releases, and "
        "an invitation to our annual harvest lunch."
    ),

    "footerAddress": "Lemberg Estate, Tulbagh Valley, 6820, Western Cape",
    "footerHours": "Tue–Sat · 10:00 — 16:00",
    "footerEmail": "info@lemberg.co.za",
    "footerPhone": "+27 23 230 0735",
    "footerInstagram": "@lembergwinery",
    "footerTagline": (
        "A small estate at the foot of the Witzenberg. Six wines a year, "
        "made with quiet conviction since 1978."
    ),

    # Application-wide settings — see SettingsPage in the studio
    "siteDescription": (
        "Lemberg Winery — small-batch wines from the Tulbagh Valley, "
        "South Africa. Editorial, terroir-driven, made with quiet conviction."
    ),
    "defaultLanguage": "en",
    "currency": "ZAR",
    "landingTheme": "dark",
    "brandAccent": "",
    "metaTitle": "Lemberg Winery — Tulbagh Valley",
    "metaDescription": "",
    "ogImage": "",
    "faviconUrl": "",
    "showAnnouncementBar": "true",
    "showPhilosophy": "true",
    "showVarietalRibbon": "true",
    "showFeaturedWine": "true",
    "showEstateBand": "true",
    "showExperience": "true",
    "showClub": "true",
    "maintenanceMode": "false",
    "maintenanceMessage": (
        "The cellar is closed for a moment. Please check back shortly — "
        "or write to us at info@lemberg.co.za."
    ),

    # ─── Studio identity (the CMS chrome itself) ───
    # These configure what editors see when working in /admin — independent
    # of how the public landing page is branded. A white-label deployment
    # would change these without touching the landing page brand.
    "studioName": "Lemberg",
    "studioEdition": "Studio · v1",
    "studioTagline": "Editorial CMS",
    "studioLogo": "",                # empty → falls back to the SVG Monogram
    "studioAccent": "",              # empty → inherits landing brandAccent
    "studioConfirmDestructive": "true",  # global confirm() before delete/apply
    "studioCompactMode": "false",    # tighter spacing in tables and lists

    # ─── Landing page section layouts ───
    # Each maps to a renderer in the matching landing section. Adding a new
    # layout = (1) implement the renderer, (2) add it to the admin picker.
    # The fallback path in the renderer protects against stale values that
    # don't match any known layout key.
    "collectionLayout": "editorial",     # editorial | filter-grid | compact | mosaic
    "collectionColumns": "3",            # "2" | "3" | "4" — applies to editorial + filter-grid
    "collectionPageSize": "9",           # "3" | "6" | "9" — landing pagination size (cap 9)
    "featuredBentoLayout": "stack-right",  # stack-right | stack-left | top-hero | tri-equal

    # ─── Featured slider ───
    # `featuredSlides` is a JSON-encoded array of slide objects.
    # `featuredSliderEnabled` is the master switch.
    "featuredSlides": "",
    "featuredSliderEnabled": "true",
    "featuredSliderAutoplay": "true",
    "featuredSliderInterval": "8000",

    # ─── Hero slider ───
    # `heroSlides` is a JSON-encoded array of slide objects (image + optional
    # per-slide copy overrides). Empty string = no slider, falls back to the
    # legacy single-image hero using heroBackgroundImage. Stored as a string
    # because the configs table is k/v-string-only.
    #
    # `heroSliderEnabled` is the master switch: false = always use single
    # image hero even when slides exist (useful for one-click rollback or
    # for preparing slides without publishing them yet). Slides themselves
    # are preserved either way.
    "heroSlides": "",
    "heroSliderEnabled": "true",
    "heroLayout": "fullscreen-center",   # fullscreen-center | split-left | split-right | caption-bottom
    "heroSliderAnimation": "fade",       # fade | slide | kenburns | stack
    "heroSliderAutoplay": "true",
    "heroSliderInterval": "6000",        # ms between auto-advances

    # ─── Age verification gate ───
    # Compliance gate shown to public visitors before they can interact with
    # the site. Editors control wording + minimum age + how long a successful
    # confirmation is remembered. Disabled by default so an empty deployment
    # doesn't surprise visitors with a gate that has placeholder copy.
    "ageGateEnabled": "false",
    "ageGateMinAge": "18",
    "ageGateHeading": "Are you of",
    "ageGateHeadingItalic": "legal drinking age?",
    "ageGateBody": (
        "The wines of Lemberg Estate are intended for visitors aged 18 and over. "
        "Please confirm your age to enter the cellar."
    ),
    "ageGateConfirmLabel": "Yes, I am of age",
    "ageGateDenyLabel": "I'm under age",
    "ageGateDenyMessage": (
        "Thank you for your honesty. Please come back when you are old enough to "
        "enjoy our wines responsibly."
    ),
    "ageGateRememberDays": "30",         # how many days to remember a confirmation
    "ageGateBackgroundImage": "",        # optional override; falls back to heroBackgroundImage
}


DEFAULT_WINES = [
    dict(
        name="Lemberg Louis",
        slug="lemberg-louis",
        vintage="2021",
        varietal="Bordeaux Blend",
        region="Tulbagh",
        category="Red · Reserve",
        description="Cabernet-led flagship. Bold, prestigious, unhurried.",
        tastingNotes="Cassis, graphite, dried bay leaf, and the faintest brush of cedar.",
        foodPairing="Slow-cooked lamb, aged hard cheese.",
        alcoholPercentage="14.5%",
        bottleCount="1,200 bottles",
        price=950.0,
        status="allocated",
        order=0,
    ),
    dict(
        name="Rhône Blend",
        slug="rhone-blend",
        vintage="2022",
        varietal="Syrah · Mourvèdre · Grenache",
        region="Tulbagh",
        category="Red",
        description="Dark fruit, spice, and enduring complexity.",
        tastingNotes="Black cherry, white pepper, smoked thyme.",
        foodPairing="Charcuterie, duck breast.",
        alcoholPercentage="14.0%",
        bottleCount="2,400 bottles",
        price=580.0,
        status="available",
        order=1,
    ),
    dict(
        name="Pinot Noir",
        slug="pinot-noir",
        vintage="2022",
        varietal="Pinot Noir",
        region="Tulbagh",
        category="Red",
        description="Delicate, refined, aromatic. Quiet conviction.",
        tastingNotes="Raspberry leaf, rose petal, wet stone.",
        foodPairing="Wild mushroom, roasted quail.",
        alcoholPercentage="13.5%",
        bottleCount="800 bottles",
        price=720.0,
        status="available",
        order=2,
    ),
    dict(
        name="Pinotage",
        slug="pinotage",
        vintage="2022",
        varietal="Pinotage",
        region="Tulbagh",
        category="Red",
        description="Rooted, confident, unmistakably South African.",
        tastingNotes="Mulberry, dark chocolate, rooibos.",
        foodPairing="Braai, smoked brisket.",
        alcoholPercentage="14.2%",
        bottleCount="1,800 bottles",
        price=420.0,
        status="available",
        order=3,
    ),
    dict(
        name="Chenin Blanc",
        slug="chenin-blanc",
        vintage="2024",
        varietal="Chenin Blanc",
        region="Tulbagh",
        category="White",
        description="A fresh, balanced expression of terroir.",
        tastingNotes="Quince, honeysuckle, sea salt.",
        foodPairing="Oysters, line-fish, fresh chèvre.",
        alcoholPercentage="13.0%",
        bottleCount="3,200 bottles",
        price=280.0,
        status="available",
        order=4,
    ),
    dict(
        name="Lady Blend",
        slug="lady-blend",
        vintage="2022",
        varietal="White Blend",
        region="Tulbagh",
        category="White",
        description="Floral, bright, and quietly luminous.",
        tastingNotes="White peach, jasmine, lemon pith.",
        foodPairing="Summer salads, soft cheeses.",
        alcoholPercentage="12.5%",
        bottleCount="1,500 bottles",
        price=360.0,
        stock=90,
        status="available",
        order=5,
    ),
]


DEFAULT_MENU = [
    {
        "label": "Collection",
        "kind": "anchor",
        "target": "#collection",
        "order": 0,
        "children": [
            {"label": "All wines", "kind": "anchor", "target": "#collection"},
            {
                "label": "Featured release",
                "kind": "anchor",
                "target": "#featured",
            },
        ],
    },
    {
        "label": "Estate",
        "kind": "anchor",
        "target": "#estate",
        "order": 1,
    },
    {
        "label": "Experience",
        "kind": "anchor",
        "target": "#experience",
        "order": 2,
    },
    {
        "label": "Journal",
        "kind": "page",
        "target": "journal",
        "order": 3,
        "pageEyebrow": "Cellar letters",
        "pageHeading": "Notes from the cellar.",
        "pageBody": (
            "We write a short letter at the end of every season — what the "
            "vineyards did, what the cellar chose to do with it, and what we "
            "are quietly pleased about.\n\n"
            "These are not press releases. They are the way we remember each "
            "vintage when we open the bottles years later.\n\n"
            "Subscribe via the allocation list on the home page to receive "
            "them in your inbox."
        ),
        "children": [
            {
                "label": "Our story",
                "kind": "page",
                "target": "our-story",
                "pageEyebrow": "Since 1978",
                "pageHeading": "Our story.",
                "pageBody": (
                    "Lemberg was planted on the Tulbagh side of the Witzenberg in 1978, "
                    "on twelve hectares of decomposed shale and weathered granite.\n\n"
                    "Three generations have farmed it. The vineyard rows have stayed the "
                    "same. The hands have changed."
                ),
            },
            {
                "label": "Harvest 2024",
                "kind": "page",
                "target": "harvest-2024",
                "pageEyebrow": "Letter 17",
                "pageHeading": "A long, quiet harvest.",
                "pageBody": (
                    "2024 gave us cool nights through to mid-March. We picked our "
                    "Chenin a fortnight later than usual and the Pinotage on a single, "
                    "warm Tuesday in the second week of April.\n\n"
                    "Yields are down — the wines are concentrated, lifted, unhurried."
                ),
            },
        ],
    },
]


def _seed_menu(db: Session) -> None:
    """Seed the header menu — once, if empty. Existing user-edited menus are
    untouched. Uses a defensive copy of DEFAULT_MENU so re-runs (after a full
    wipe via the API) still see the original children — the previous version
    mutated the module-level dict and silently dropped children on retry."""
    if db.query(MenuItem).count() > 0:
        return
    for parent in DEFAULT_MENU:
        # shallow-copy + pull children out without mutating the original
        parent_data = {k: v for k, v in parent.items() if k != "children"}
        children = parent.get("children", []) or []
        db_parent = MenuItem(**parent_data, isVisible=True)
        db.add(db_parent)
        db.flush()  # populate db_parent.id
        for child_idx, child in enumerate(children):
            db.add(
                MenuItem(
                    **{k: v for k, v in child.items() if k != "children"},
                    parent_id=db_parent.id,
                    order=child_idx,
                    isVisible=True,
                )
            )
    db.commit()


def _seed_default_template(db: Session) -> None:
    """If the templates library is empty, snapshot the live brand+theme
    config into a "Default" template and mark it as the active one. Gives
    the studio a sensible starting point (the editor can always revert to
    the original look) and seeds the `activeTemplateId` config key so the
    Templates page can badge the right card."""
    if db.query(Template).count() > 0:
        return

    # Mirrors TEMPLATE_FIELDS in app/api/templates.py — keep in sync.
    fields = (
        "logoText", "logoImage", "logoFont",
        "landingTheme", "brandAccent", "navAnnouncement",
        "showAnnouncementBar", "showPhilosophy", "showVarietalRibbon",
        "ribbonFormat", "ribbonText", "ribbonImages",
        "showFeaturedWine", "showEstateBand", "showExperience", "showClub",
    )
    rows = db.query(Config).filter(Config.key.in_(fields)).all()
    payload = {r.key: (r.value or "") for r in rows}
    if not payload:
        return  # configs not seeded yet — try again on next boot

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    template = Template(
        name="Default editorial",
        description=(
            "The current live look — saved automatically the first time the "
            "studio booted with template support. Apply to revert to the "
            "original brand snapshot."
        ),
        payload=payload,
        createdAt=now,
        updatedAt=now,
    )
    db.add(template)
    db.flush()  # populates template.id

    # Set activeTemplateId so the Templates page can badge this row.
    active = db.query(Config).filter(Config.key == "activeTemplateId").first()
    if active:
        active.value = str(template.id)
    else:
        db.add(Config(key="activeTemplateId", value=str(template.id)))
    db.commit()


def seed_defaults(db: Session) -> None:
    """Seed first-boot defaults and backfill any new keys added in later releases.

    Existing values are never overwritten — editors keep their customisations.
    """
    existing_keys = {c.key for c in db.query(Config).all()}
    added = 0
    for key, value in DEFAULT_CONFIG.items():
        if key not in existing_keys:
            db.add(Config(key=key, value=str(value)))
            added += 1
    if added:
        db.commit()

    # Seed wines only if empty
    if db.query(Wine).count() == 0:
        for w in DEFAULT_WINES:
            db.add(Wine(**w))
        db.commit()

    # Seed menu only if empty
    _seed_menu(db)

    # Seed default template + activeTemplateId (idempotent — skips if templates
    # table already has rows; safe to run on every boot).
    _seed_default_template(db)

