export type WineStatus = "available" | "allocated" | "library" | "sold-out";

export interface Wine {
  id: number | string;
  slug?: string;
  name: string;
  vintage?: string;
  varietal?: string;
  region?: string;
  alcohol?: string;
  description?: string;
  tastingNotes?: string;
  foodPairing?: string;
  price?: number;
  status?: WineStatus | string;
  /** Legacy single-image field; still used as fallback when `images` is empty. */
  image?: string;
  /** Optional alternate (label-on-background). */
  labelImage?: string;
  /** Editorial gallery. `images[0]` is the default shown on the landing card.
   *  When empty, the legacy `image` field is the fallback. */
  images?: string[];
  order?: number;
}

/** The image to display on the landing card / modal hero.
 *  Prefer `images[0]` (explicit editor choice), fall back to legacy `image`. */
export function wineDefaultImage(w: Wine | null | undefined): string {
  if (!w) return "";
  if (Array.isArray(w.images) && w.images.length > 0 && w.images[0]) {
    return w.images[0];
  }
  return w.image || "";
}

/** Full gallery including the legacy image (de-duplicated) — for the modal. */
export function wineGallery(w: Wine | null | undefined): string[] {
  if (!w) return [];
  const out = Array.isArray(w.images) ? w.images.filter(Boolean) : [];
  if (out.length === 0 && w.image) return [w.image];
  return out;
}

export interface SiteConfig {
  logoText?: string;
  logoImage?: string;
  logoFont?: string;       // Google Font family for the wordmark text

  navAnnouncement?: string;

  heroEyebrow?: string;
  heroHeading?: string;
  heroHeadingItalic?: string;
  heroSubheading?: string;
  heroBackgroundImage?: string;
  heroCta?: string;

  philosophyEyebrow?: string;
  philosophyHeading?: string;
  philosophyHeadingItalic?: string;
  philosophyBody?: string;
  philosophyImage?: string;
  philosophyEstYear?: string;

  collectionEyebrow?: string;
  collectionHeading?: string;
  collectionItalic?: string;

  featuredWineId?: string | number;
  featuredHeading?: string;
  featuredBody?: string;
  featuredImage?: string;                  // primary bento slot — overrides wine.image
  featuredImageAccent1?: string;           // bento top-right
  featuredImageAccent2?: string;           // bento bottom-right
  featuredImageAccent1Caption?: string;
  featuredImageAccent2Caption?: string;
  featuredEyebrow?: string;

  estateHeading?: string;
  estateBody?: string;
  estateImage?: string;
  estateEyebrow?: string;

  experienceEyebrow?: string;
  experienceHeading?: string;
  experienceItalic?: string;
  experienceBody?: string;
  experienceImage?: string;
  experienceCta?: string;
  experienceCtaEmail?: string;     // mailto target — falls back to footerEmail
  experienceHours?: string;        // e.g. "Tue–Sat · 10:00 — 16:00"
  experienceTasting?: string;      // e.g. "6 wines · 75 min"
  experienceBooking?: string;      // e.g. "By appointment only"

  clubEyebrow?: string;
  clubHeading?: string;
  clubBody?: string;

  footerAddress?: string;
  footerHours?: string;
  footerEmail?: string;
  footerPhone?: string;
  footerInstagram?: string;

  /* ─────────────────────────────────────────────────────────────────
     Application-wide settings (Settings page)
     ───────────────────────────────────────────────────────────────── */

  // General
  siteDescription?: string;       // SEO meta + opengraph fallback
  defaultLanguage?: string;        // "en" | "af" — sets <html lang>
  currency?: string;               // "ZAR" | "USD" | "EUR" — wine price symbol

  // Appearance — affects the public landing page
  landingTheme?: string;           // "dark" | "light" | "auto"
  brandAccent?: string;            // hex color, overrides --color-pearl-300

  // SEO
  metaTitle?: string;              // overrides <title>
  metaDescription?: string;        // overrides meta description (falls back to siteDescription)
  ogImage?: string;                // social-share image
  faviconUrl?: string;             // favicon override

  // Section visibility — booleans serialised as "true" / "false"
  showAnnouncementBar?: string;
  showPhilosophy?: string;
  showVarietalRibbon?: string;
  showFeaturedWine?: string;
  showEstateBand?: string;
  showExperience?: string;
  showClub?: string;

  // Maintenance
  maintenanceMode?: string;        // "true" / "false"
  maintenanceMessage?: string;

  // Active template — set by POST /api/templates/{id}/apply and consumed by
  // the studio's Template library to badge the currently-applied snapshot.
  // Empty string means "no template currently active".
  activeTemplateId?: string;

  // ─── Studio identity (CMS chrome — separate from landing-page brand) ───
  // Lets a deployment white-label the admin UI without touching the public
  // site. Surfaces: Sidebar header, Login screen, AdminFooter, TopBar.
  studioName?: string;
  studioEdition?: string;
  studioTagline?: string;
  studioLogo?: string;                  // image url; empty = use Monogram SVG
  studioAccent?: string;                // hex; empty = inherit landingTheme accent
  studioConfirmDestructive?: string;    // "true" / "false"
  studioCompactMode?: string;           // "true" / "false"

  // ─── Landing-page layout variants ───
  // Each value maps to a renderer in its matching section component.
  // Unknown values fall back to the default renderer — safe to roll back.
  collectionLayout?: string;            // editorial | filter-grid | compact | mosaic
  collectionColumns?: string;           // "2" | "3" | "4" — desktop column count
  featuredBentoLayout?: string;         // stack-right | stack-left | top-hero | tri-equal

  // ─── Hero slider ───
  // `heroSlides` is a JSON-encoded array — see HeroSlide / parseHeroSlides
  // below. Empty string → fall back to the legacy single-image hero.
  // `heroSliderEnabled` is the master switch (independent of whether slides
  // exist), so editors can prepare slides as drafts without publishing.
  heroSlides?: string;
  heroSliderEnabled?: string;           // "true" / "false" — master switch
  heroLayout?: string;                  // fullscreen-center | split-left | split-right | caption-bottom
  heroSliderAnimation?: string;         // fade | slide | kenburns | stack
  heroSliderAutoplay?: string;          // "true" / "false"
  heroSliderInterval?: string;          // ms (numeric string)
}

/* Helpers for boolean-as-string config values. The backend stores all
 * config rows as strings; helpers keep callers honest. */
export function configFlag(v: string | undefined, fallback = true): boolean {
  if (v === undefined || v === null || v === "") return fallback;
  return v === "true" || v === "1" || v === "on";
}

export function flagValue(b: boolean): string {
  return b ? "true" : "false";
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function currencySymbol(code: string | undefined): string {
  return CURRENCY_SYMBOLS[(code || "ZAR").toUpperCase()] || "R";
}

/* Keys that may legitimately hold the literal string "false" / "0" / "off"
 * — boolean toggles. The smart-merge below must NOT skip those values just
 * because they look "empty-ish". */
const TOGGLE_KEYS: ReadonlySet<keyof SiteConfig> = new Set([
  "showAnnouncementBar",
  "showPhilosophy",
  "showVarietalRibbon",
  "showFeaturedWine",
  "showEstateBand",
  "showExperience",
  "showClub",
  "maintenanceMode",
]);

/**
 * Merge a remote config response onto FALLBACK_CONFIG.
 *
 * Plain `{ ...FALLBACK, ...remote }` clobbers fallback defaults with empty
 * strings whenever the editor saves a blank field (or the seed left a key
 * empty). That broke image fields the most visibly: a saved empty
 * `experienceImage` would replace the Unsplash fallback and the section
 * would render with no picture.
 *
 * This helper keeps the fallback for any key whose remote value is an
 * empty string, **except** for boolean toggle keys where "false" / "" is a
 * meaningful "user disabled this" signal.
 */
export function mergeRemoteConfig(remote: Partial<SiteConfig>): SiteConfig {
  const out: SiteConfig = { ...FALLBACK_CONFIG };
  for (const [k, v] of Object.entries(remote)) {
    if (v === null || v === undefined) continue;
    const key = k as keyof SiteConfig;
    if (typeof v === "string" && v.trim() === "" && !TOGGLE_KEYS.has(key)) {
      // Skip — keep the FALLBACK value
      continue;
    }
    (out as any)[key] = v;
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────
   Menu items (header navigation)
   ───────────────────────────────────────────────────────────────── */

export type MenuKind = "anchor" | "page" | "external";

export interface MenuItem {
  id: number;
  parent_id?: number | null;
  label: string;
  kind: MenuKind;
  target: string;
  order: number;
  isVisible: boolean;
  pageEyebrow?: string | null;
  pageHeading?: string | null;
  pageBody?: string | null;
  pageImage?: string | null;
}

export interface MenuItemNode extends MenuItem {
  children: MenuItem[];
}

export const MENU_KIND_LABEL: Record<MenuKind, string> = {
  anchor: "Section anchor",
  page: "Generated page",
  external: "External link",
};

export const MENU_KIND_HINT: Record<MenuKind, string> = {
  anchor:
    "Smooth-scroll to a section on the landing page. Target: a hash like #collection.",
  page:
    "Create a dedicated page at /page/{target}. Fill in Page heading + body below.",
  external: "Open a URL in a new tab. Target: a full URL (https://…).",
};

/** Minimal slugifier — lowercase, dashes, ASCII-safe enough for routing. */
export function slugify(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ─────────────────────────────────────────────────────────────────
   Reservations (tasting / visit form)
   ───────────────────────────────────────────────────────────────── */

export interface Reservation {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  party_size: number;
  visit_date: string;   // YYYY-MM-DD
  visit_time: string;   // HH:MM
  message?: string | null;
  status: "new" | "confirmed" | "cancelled" | string;
  createdAt: string;    // ISO 8601 UTC
}

/* ─────────────────────────────────────────────────────────────────
   Theme templates (saved brand + theme + section-visibility snapshots)
   ───────────────────────────────────────────────────────────────── */

/** Subset of SiteConfig that gets stored in a template payload.
 *  Mirrors backend `TEMPLATE_FIELDS` in api/templates.py. */
export const TEMPLATE_FIELDS = [
  "logoText",
  "logoImage",
  "logoFont",
  "landingTheme",
  "brandAccent",
  "navAnnouncement",
  "showAnnouncementBar",
  "showPhilosophy",
  "showVarietalRibbon",
  "showFeaturedWine",
  "showEstateBand",
  "showExperience",
  "showClub",
] as const;

export type TemplateField = (typeof TEMPLATE_FIELDS)[number];

export type TemplatePayload = Partial<Record<TemplateField, string>>;

export interface Template {
  id: number;
  name: string;
  description?: string | null;
  thumbnail?: string | null;
  payload: TemplatePayload;
  createdAt: string;
  updatedAt: string;
}

/** Extract template-relevant fields from a full SiteConfig. */
export function pickTemplatePayload(config: SiteConfig): TemplatePayload {
  const out: TemplatePayload = {};
  for (const key of TEMPLATE_FIELDS) {
    const value = (config as Record<string, unknown>)[key];
    if (value !== undefined && value !== null) {
      out[key] = String(value);
    }
  }
  return out;
}

/** Cheap human summary of what a template will change — for UI hints. */
export function describeTemplate(t: Template): {
  theme: string;
  accent: string;
  font: string;
  sectionsHidden: number;
} {
  const p = t.payload || {};
  const visibilityKeys: TemplateField[] = [
    "showAnnouncementBar",
    "showPhilosophy",
    "showVarietalRibbon",
    "showFeaturedWine",
    "showEstateBand",
    "showExperience",
    "showClub",
  ];
  let sectionsHidden = 0;
  for (const k of visibilityKeys) {
    if (p[k] === "false") sectionsHidden++;
  }
  return {
    theme: p.landingTheme || "dark",
    accent: p.brandAccent || "",
    font: p.logoFont || "Cormorant Garamond",
    sectionsHidden,
  };
}

export interface Subscriber {
  id: number;
  email: string;
  name?: string | null;
  subscribed: boolean;
  source?: string | null;
  createdAt: string;
}

export interface ReservationCreate {
  name: string;
  email: string;
  phone?: string;
  party_size: number;
  visit_date: string;
  visit_time: string;
  message?: string;
}

/* ─────────────────────────────────────────────────────────────────
   Curated Google Fonts for the wordmark (Brand settings)
   ───────────────────────────────────────────────────────────────── */

export interface BrandFont {
  family: string;
  category: "serif" | "display" | "sans";
  /** Where the font comes from:
   *  - "google": auto-loaded from fonts.googleapis.com (no licensing needed)
   *  - "system": commercial typeface — works only if the visitor has it
   *              installed locally (e.g. Adobe Creative Cloud sync). A fallback
   *              chain is applied so the page never breaks. */
  source: "google" | "system";
  /** Comma-separated CSS fallback chain. Required for "system" fonts —
   *  recommended visually-similar alternates the picker can preview with. */
  fallback?: string;
}

export const BRAND_FONTS: BrandFont[] = [
  // ── Editorial serifs (Google Fonts, default-loaded) ──
  { family: "Cormorant Garamond", category: "serif", source: "google" },
  { family: "Playfair Display", category: "serif", source: "google" },
  { family: "EB Garamond", category: "serif", source: "google" },
  { family: "Cardo", category: "serif", source: "google" },
  { family: "Italiana", category: "display", source: "google" },
  { family: "Marcellus", category: "serif", source: "google" },
  { family: "Forum", category: "display", source: "google" },
  { family: "Cinzel", category: "display", source: "google" },
  { family: "DM Serif Display", category: "display", source: "google" },
  { family: "Spectral", category: "serif", source: "google" },
  { family: "Tenor Sans", category: "sans", source: "google" },
  { family: "Bodoni Moda", category: "serif", source: "google" },

  // ── Geometric & humanist sans (Google Fonts) ──
  { family: "Montserrat", category: "sans", source: "google" },
  { family: "Josefin Sans", category: "sans", source: "google" },
  // Jost is a free, modern recreation of Futura — recommended whenever Futura
  // isn't available locally. Listed alongside the commercial Futura option.
  { family: "Jost", category: "sans", source: "google" },

  // ── Commercial fonts ─────────────────────────────────
  // These are not on Google Fonts. They render correctly when the visitor's
  // device has them installed (Adobe Fonts, macOS Catalogue, corporate kit);
  // otherwise the fallback chain keeps the layout visually consistent.
  {
    family: "Gotham",
    category: "sans",
    source: "system",
    fallback: '"Helvetica Neue", "Montserrat", "Arial", sans-serif',
  },
  {
    family: "Proxima Nova",
    category: "sans",
    source: "system",
    fallback: '"Inter", "Open Sans", "Helvetica Neue", "Arial", sans-serif',
  },
  {
    family: "Futura",
    category: "sans",
    source: "system",
    fallback: '"Jost", "Trebuchet MS", "Century Gothic", "Helvetica Neue", sans-serif',
  },
];

/** Lookup a brand font's full record (or undefined if family isn't in
 *  the catalogue — happens when an editor manually pastes a family name). */
export function findBrandFont(family: string | undefined): BrandFont | undefined {
  if (!family) return undefined;
  return BRAND_FONTS.find((f) => f.family.toLowerCase() === family.toLowerCase());
}

/** Build a Google Fonts stylesheet URL — only families with source="google".
 *  System (commercial) fonts are silently skipped so we don't issue a 404
 *  request to fonts.googleapis.com. */
export function googleFontsUrl(
  families: string[],
  weights = "300;400;500;600"
): string {
  const params = families
    .map((raw) => {
      const meta = findBrandFont(raw);
      // If the family isn't in our catalogue, optimistically request it from
      // Google — keeps backward compatibility with old DB values.
      const fromGoogle = !meta || meta.source === "google";
      return fromGoogle ? `family=${encodeURIComponent(raw)}:wght@${weights}` : null;
    })
    .filter(Boolean)
    .join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

export const FALLBACK_MENU: MenuItemNode[] = [
  {
    id: -1,
    label: "Collection",
    kind: "anchor",
    target: "#collection",
    order: 0,
    isVisible: true,
    children: [],
  },
  {
    id: -2,
    label: "Estate",
    kind: "anchor",
    target: "#estate",
    order: 1,
    isVisible: true,
    children: [],
  },
  {
    id: -3,
    label: "Experience",
    kind: "anchor",
    target: "#experience",
    order: 2,
    isVisible: true,
    children: [],
  },
];

export const FALLBACK_CONFIG: SiteConfig = {
  logoText: "Lemberg",
  logoFont: "Cormorant Garamond",
  navAnnouncement: "Vintage 2024 — pre-allocation open",

  heroEyebrow: "Tulbagh Valley · South Africa",
  heroHeading: "Quiet wines, made\nwith patience and",
  heroHeadingItalic: "extraordinary intent.",
  heroSubheading:
    "Hand-tended vineyards on a small family estate at the foot of the Witzenberg. Restrained winemaking. A single, unhurried release each season.",
  heroBackgroundImage:
    "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=2400&q=80&auto=format&fit=crop",
  heroCta: "View the collection",

  philosophyEyebrow: "The estate",
  philosophyHeading: "Rooted in the soil.",
  philosophyHeadingItalic: "Guided by the season.",
  philosophyBody:
    "Lemberg is one of the smallest wineries in the Cape, set on twelve hectares of decomposed shale and weathered granite. We farm without rush — pruning, picking, and pressing by hand — and let each vintage speak for itself in the cellar.\n\nNothing is added that the vineyard did not give. Nothing is removed that the wine does not require.",
  philosophyImage:
    "https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=1600&q=80&auto=format&fit=crop",
  philosophyEstYear: "Est. 1978",

  collectionEyebrow: "The collection",
  collectionHeading: "Six wines.",
  collectionItalic: "One season.",

  featuredEyebrow: "Flagship release",
  featuredHeading: "Lemberg Louis",
  featuredBody:
    "Our flagship Bordeaux-style red. Built on Cabernet Sauvignon from the home block, with parcels of Merlot and Cabernet Franc from older vines. Twenty-two months in French oak. A wine of slow conversations and longer evenings.",
  featuredImage: "",
  featuredImageAccent1:
    "https://images.unsplash.com/photo-1543418219-44e30b057fea?w=1200&q=80&auto=format&fit=crop",
  featuredImageAccent2:
    "https://images.unsplash.com/photo-1510626176961-4b57d4fbad03?w=1200&q=80&auto=format&fit=crop",
  featuredImageAccent1Caption: "In the cellar",
  featuredImageAccent2Caption: "From the home block",

  estateEyebrow: "The valley",
  estateHeading: "Where the morning mist meets the granite.",
  estateBody:
    "The Tulbagh basin sits ringed by three mountain ranges. Cold nights, hot days, and the constant breath of the Atlantic give our fruit the slow ripening it needs to keep its lift.",
  estateImage:
    "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=2400&q=80&auto=format&fit=crop",

  experienceEyebrow: "Visit the estate",
  experienceHeading: "Stay a while.",
  experienceItalic: "Savour the depth.",
  experienceBody:
    "Private tastings by appointment, Tuesday to Saturday. Walk the home block at golden hour, share a flight of six in our cellar, and take home a bottle from the library.",
  experienceImage:
    "https://images.unsplash.com/photo-1474722883778-792e7990302f?w=2400&q=80&auto=format&fit=crop",
  experienceCta: "Book a tasting",
  experienceCtaEmail: "",
  experienceHours: "Tue–Sat · 10:00 — 16:00",
  experienceTasting: "6 wines · 75 min",
  experienceBooking: "By appointment only",

  clubEyebrow: "Allocation list",
  clubHeading: "Join the club.",
  clubBody:
    "A short note from the cellar each season, first access to library releases, and an invitation to our annual harvest lunch.",

  footerAddress: "Lemberg Estate, Tulbagh Valley, 6820, Western Cape",
  footerHours: "Tue–Sat · 10:00 — 16:00",
  footerEmail: "info@lemberg.co.za",
  footerPhone: "+27 23 230 0735",
  footerInstagram: "@lembergwinery",

  // Settings defaults
  siteDescription:
    "Lemberg Winery — small-batch wines from the Tulbagh Valley, South Africa. Editorial, terroir-driven, made with quiet conviction.",
  defaultLanguage: "en",
  currency: "ZAR",
  landingTheme: "dark",
  brandAccent: "",
  metaTitle: "Lemberg Winery — Tulbagh Valley",
  metaDescription: "",
  ogImage: "",
  faviconUrl: "",
  showAnnouncementBar: "true",
  showPhilosophy: "true",
  showVarietalRibbon: "true",
  showFeaturedWine: "true",
  showEstateBand: "true",
  showExperience: "true",
  showClub: "true",
  maintenanceMode: "false",
  maintenanceMessage:
    "The cellar is closed for a moment. Please check back shortly — or write to us at info@lemberg.co.za.",
  activeTemplateId: "",

  // Studio identity
  studioName: "Lemberg",
  studioEdition: "Studio · v1",
  studioTagline: "Editorial CMS",
  studioLogo: "",
  studioAccent: "",
  studioConfirmDestructive: "true",
  studioCompactMode: "false",

  // Landing layout variants
  collectionLayout: "editorial",
  collectionColumns: "3",
  featuredBentoLayout: "stack-right",

  // Hero slider — empty slides → legacy single-image hero
  heroSlides: "",
  heroSliderEnabled: "true",
  heroLayout: "fullscreen-center",
  heroSliderAnimation: "fade",
  heroSliderAutoplay: "true",
  heroSliderInterval: "6000",
};

export const FALLBACK_WINES: Wine[] = [
  {
    id: "louis",
    slug: "lemberg-louis",
    name: "Lemberg Louis",
    vintage: "2021",
    varietal: "Bordeaux Blend",
    region: "Tulbagh",
    alcohol: "14.0%",
    description: "Cabernet-led flagship. Bold, prestigious, unhurried.",
    tastingNotes:
      "Cassis, graphite, dried bay leaf and the faintest brush of cedar.",
    foodPairing: "Slow-cooked lamb, aged hard cheese.",
    price: 950,
    status: "allocated",
    image:
      "https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1200&q=80&auto=format&fit=crop",
    order: 0,
  },
  {
    id: "rhone",
    slug: "rhone-blend",
    name: "Rhône Blend",
    vintage: "2022",
    varietal: "Syrah · Mourvèdre · Grenache",
    region: "Tulbagh",
    alcohol: "13.5%",
    description: "Dark fruit, spice, and enduring complexity.",
    tastingNotes: "Black cherry, white pepper, smoked thyme.",
    foodPairing: "Charcuterie, duck breast.",
    price: 580,
    status: "available",
    image:
      "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=1200&q=80&auto=format&fit=crop",
    order: 1,
  },
  {
    id: "pinot-noir",
    slug: "pinot-noir",
    name: "Pinot Noir",
    vintage: "2022",
    varietal: "Pinot Noir",
    region: "Tulbagh",
    alcohol: "12.5%",
    description: "Delicate, refined, aromatic. Quiet conviction.",
    tastingNotes: "Raspberry leaf, rose petal, wet stone.",
    foodPairing: "Wild mushroom, roasted quail.",
    price: 720,
    status: "available",
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=1200&q=80&auto=format&fit=crop",
    order: 2,
  },
  {
    id: "pinotage",
    slug: "pinotage",
    name: "Pinotage",
    vintage: "2022",
    varietal: "Pinotage",
    region: "Tulbagh",
    alcohol: "13.5%",
    description: "Rooted, confident, unmistakably South African.",
    tastingNotes: "Mulberry, dark chocolate, rooibos.",
    foodPairing: "Braai, smoked brisket.",
    price: 420,
    status: "available",
    image:
      "https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?w=1200&q=80&auto=format&fit=crop",
    order: 3,
  },
  {
    id: "chenin",
    slug: "chenin-blanc",
    name: "Chenin Blanc",
    vintage: "2024",
    varietal: "Chenin Blanc",
    region: "Tulbagh",
    alcohol: "12.5%",
    description: "A fresh, balanced expression of terroir.",
    tastingNotes: "Quince, honeysuckle, sea salt.",
    foodPairing: "Oysters, line-fish, fresh chèvre.",
    price: 280,
    status: "available",
    image:
      "https://images.unsplash.com/photo-1592985731819-c2c80f3ad5dc?w=1200&q=80&auto=format&fit=crop",
    order: 4,
  },
  {
    id: "lady-blend",
    slug: "lady-blend",
    name: "Lady Blend",
    vintage: "2022",
    varietal: "White Blend",
    region: "Tulbagh",
    alcohol: "12.5%",
    description: "Floral, bright, and quietly luminous.",
    tastingNotes: "White peach, jasmine, lemon pith.",
    foodPairing: "Summer salads, soft cheeses.",
    price: 360,
    status: "available",
    image:
      "https://images.unsplash.com/photo-1474722883634-f73e64eda8b9?w=1200&q=80&auto=format&fit=crop",
    order: 5,
  },
];

/* ─────────────────────────────────────────────────────────────────────
   Hero slider
   ───────────────────────────────────────────────────────────────────── */

/** A single slide. `image` is required; every text field is optional — when
 *  blank, the slide inherits from the base hero copy (config.heroEyebrow,
 *  heroHeading, etc.) so editors can swap just the photo per slide. */
export interface HeroSlide {
  image: string;
  eyebrow?: string;
  heading?: string;
  headingItalic?: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
}

/** Defensive JSON.parse of the stringified slide array stored in the
 *  configs table. Bad JSON or non-arrays return []; entries that aren't
 *  shaped like a slide are filtered out. Slides WITHOUT an image are
 *  preserved as "draft" state — editors can add a slide and upload its
 *  image in two steps. Filter `isRenderableSlide(s)` at render time on
 *  the public section to skip drafts. */
export function parseHeroSlides(raw: string | undefined | null): HeroSlide[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is Record<string, unknown> =>
          s !== null && typeof s === "object" && !Array.isArray(s)
      )
      .map((s) => {
        const image = typeof s.image === "string" ? s.image : "";
        return {
          image,
          eyebrow: typeof s.eyebrow === "string" ? s.eyebrow : undefined,
          heading: typeof s.heading === "string" ? s.heading : undefined,
          headingItalic:
            typeof s.headingItalic === "string" ? s.headingItalic : undefined,
          subheading:
            typeof s.subheading === "string" ? s.subheading : undefined,
          ctaLabel: typeof s.ctaLabel === "string" ? s.ctaLabel : undefined,
          ctaHref: typeof s.ctaHref === "string" ? s.ctaHref : undefined,
        };
      });
  } catch {
    return [];
  }
}

/** Symmetric serializer — preserves draft slides (those without an image)
 *  so the admin's list survives a save/refetch round-trip while the editor
 *  is mid-edit. The public section filters them out via `isRenderableSlide`
 *  at render time, so drafts never appear on the live page.
 *
 *  IMPORTANT: do NOT trim text fields. The admin commits on every
 *  keystroke, so any trim here would eat the trailing space the user
 *  *just typed* — making it impossible to type "Hello world" because
 *  the space gets canonicalised away before the second word arrives.
 *  Empty strings are still dropped so blank fields fall back to base copy.
 *  `image` is the one exception — it's a URL/upload-path; trimming it
 *  on commit doesn't bite the editor because ImageField commits whole
 *  values rather than character-by-character. */
export function serializeHeroSlides(slides: HeroSlide[]): string {
  const clean = slides.map((s) => {
    const out: HeroSlide = { image: (s.image || "").trim() };
    if (s.eyebrow && s.eyebrow.length > 0) out.eyebrow = s.eyebrow;
    if (s.heading && s.heading.length > 0) out.heading = s.heading;
    if (s.headingItalic && s.headingItalic.length > 0) out.headingItalic = s.headingItalic;
    if (s.subheading && s.subheading.length > 0) out.subheading = s.subheading;
    if (s.ctaLabel && s.ctaLabel.length > 0) out.ctaLabel = s.ctaLabel;
    if (s.ctaHref && s.ctaHref.length > 0) out.ctaHref = s.ctaHref;
    return out;
  });
  return clean.length > 0 ? JSON.stringify(clean) : "";
}

/** A slide is renderable only when it has an image — the section filters
 *  drafts out at render time so they live only in the admin until ready. */
export function isRenderableSlide(slide: HeroSlide): boolean {
  return Boolean(slide.image && slide.image.trim().length > 0);
}

/** Merge a slide's per-slide overrides with the section's base hero copy.
 *  Empty/undefined fields on the slide fall back to the SiteConfig values,
 *  so editors can use the slider purely for background imagery and let the
 *  base copy stay constant. */
export function resolveSlideContent(
  slide: HeroSlide,
  config: SiteConfig
): Required<Pick<HeroSlide, "image" | "eyebrow" | "heading" | "headingItalic" | "subheading" | "ctaLabel" | "ctaHref">> {
  return {
    image: slide.image,
    eyebrow: slide.eyebrow || config.heroEyebrow || "",
    heading: slide.heading || config.heroHeading || "",
    headingItalic: slide.headingItalic || config.heroHeadingItalic || "",
    subheading: slide.subheading || config.heroSubheading || "",
    ctaLabel: slide.ctaLabel || config.heroCta || "View the collection",
    ctaHref: slide.ctaHref || "#collection",
  };
}
