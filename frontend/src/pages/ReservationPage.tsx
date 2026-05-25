import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Clock,
  Users,
  Mail,
  Phone,
  Sparkles,
  User as UserIcon,
  MapPin,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Nav } from "../components/Nav";
import { AgeGate } from "../components/AgeGate";
import { Footer } from "../components/sections/Footer";
import { Reveal, RevealLines } from "../components/motion/Reveal";
import {
  FALLBACK_CONFIG,
  FALLBACK_MENU,
  configFlag,
  mergeRemoteConfig,
  parseEventTypes,
  type MenuItemNode,
  type Reservation,
  type SiteConfig,
} from "../lib/types";
import {
  createReservation,
  fetchConfig,
  fetchMenu,
  fetchWines,
} from "../services/api";
import { useDocumentMeta, useLandingTheme } from "../lib/useDocumentMeta";
import { cacheBrand } from "../lib/brandCache";
import {
  readCachedConfig,
  readCachedMenu,
  writeCachedConfig,
  writeCachedMenu,
} from "../lib/dataCache";
import { cn } from "../lib/utils";

const TIME_SLOTS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];

export default function ReservationPage() {
  // Persistent cache → first paint uses the editor's published brand /
  // header / footer instead of fallback Unsplash content.
  const [config, setConfig] = useState<SiteConfig>(
    () => readCachedConfig() || FALLBACK_CONFIG
  );
  const [menu, setMenu] = useState<MenuItemNode[]>(
    () => readCachedMenu() || FALLBACK_MENU
  );
  const location = useLocation();

  // Pre-fill date from ?date= or default to next Tue–Sat. ?wine=slug lets
  // the wine-detail modal hand off to this form with a contextual message.
  const params = new URLSearchParams(location.search);
  const seedDate =
    params.get("date") ||
    nextOpenDate().toISOString().slice(0, 10);
  const wineSlug = params.get("wine") || "";

  const [eventType, setEventType] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [visitDate, setVisitDate] = useState(seedDate);
  const [visitTime, setVisitTime] = useState("11:00");
  const [message, setMessage] = useState("");

  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Reservation | null>(null);

  useEffect(() => {
    fetchConfig()
      .then((c) => {
        if (c && Object.keys(c).length > 0) {
          const merged = mergeRemoteConfig(c);
          setConfig(merged);
          writeCachedConfig(merged);
          cacheBrand(merged);
        }
      })
      .catch(() => {});
    fetchMenu()
      .then((m) => {
        if (Array.isArray(m) && m.length > 0) {
          setMenu(m);
          writeCachedMenu(m);
        }
      })
      .catch(() => {});
  }, []);

  // If the user arrived via "Reserve a bottle" from a wine detail modal,
  // resolve the slug so we can show the wine context + pre-seed the message.
  useEffect(() => {
    if (!wineSlug) return;
    let alive = true;
    fetchWines()
      .then((all) => {
        if (!alive) return;
        const found =
          all.find((w) => String(w.slug || w.id) === wineSlug) || null;
        if (!found) return;
        setMessage((cur) =>
          cur
            ? cur
            : `I'd like to reserve a bottle of ${found.name}${
                found.vintage ? " " + found.vintage : ""
              }.`
        );
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wineSlug]);

  useDocumentMeta({
    ...config,
    metaTitle: `Reserve a tasting — ${config.logoText || "Lemberg"}`,
    metaDescription:
      "Reserve a private tasting at the Lemberg estate in Tulbagh. Six wines, seventy-five minutes, by appointment.",
  });

  const theme = useLandingTheme(config.landingTheme);
  const showAnnouncementBar = configFlag(config.showAnnouncementBar, true);
  const accentStyle: CSSProperties = config.brandAccent
    ? ({ "--color-pearl-300": config.brandAccent } as CSSProperties)
    : {};

  // Event taxonomy comes from the CMS — editors can add/remove entries
  // without redeploying. Default selection seeds the first option once
  // we know the live list (also handles the SSR / cache → live config
  // transition cleanly: if the cache had a different list, the seed
  // re-runs as soon as the live config arrives).
  const eventTypes = useMemo(
    () => parseEventTypes(config.reservationEventTypes),
    [config.reservationEventTypes]
  );
  useEffect(() => {
    if (!eventType && eventTypes.length > 0) {
      // Prefer "Wine tastings" if present (most-common public choice),
      // otherwise fall back to the first option in the editor's list.
      const preferred =
        eventTypes.find((t) => t.toLowerCase().includes("wine tasting")) ||
        eventTypes[0];
      setEventType(preferred);
    }
  }, [eventTypes, eventType]);

  const errors = useMemo(
    () =>
      validateForm({
        eventType,
        name,
        email,
        visitDate,
        visitTime,
        partySize,
        knownEventTypes: eventTypes,
      }),
    [eventType, name, email, visitDate, visitTime, partySize, eventTypes]
  );
  const isValid = Object.keys(errors).length === 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (!isValid) return;
    setSubmitting(true);
    try {
      const reservation = await createReservation({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        event_type: eventType.trim() || undefined,
        party_size: partySize,
        visit_date: visitDate,
        visit_time: visitTime,
        message: message.trim() || undefined,
      });
      setSubmitted(reservation);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setServerError(
        typeof detail === "string"
          ? detail
          : "Could not submit the request — please try again or write to us directly."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      data-theme={theme}
      style={accentStyle}
      className="relative min-h-screen bg-[var(--color-ink-900)] text-[var(--color-bone-100)]"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-[var(--color-bone-50)] focus:px-4 focus:py-2 focus:text-sm focus:text-[var(--color-ink-900)]"
      >
        Skip to content
      </a>

      <AgeGate config={config} />
      <Nav config={config} menu={menu} showAnnouncementBar={showAnnouncementBar} />

      <main id="main" className="mx-auto max-w-[1200px] px-6 pt-44 pb-32 md:px-10 md:pt-52 md:pb-32">
        <Reveal y={10} className="mb-6">
          <Link
            to="/"
            className="label-eyebrow inline-flex items-center gap-2 text-[var(--color-bone-500)] transition-colors hover:text-[var(--color-bone-100)]"
          >
            <ArrowLeft size={11} /> Back to home
          </Link>
        </Reveal>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <SuccessPanel reservation={submitted} config={config} />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="grid gap-12 md:grid-cols-[1fr_360px] md:gap-16 lg:gap-24"
            >
              {/* ── FORM ────────────────────────────────────────── */}
              <section>
                <header className="mb-12 md:mb-16">
                  <Reveal y={10} delay={0.05}>
                    <div className="mb-8 flex items-center gap-4">
                      <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
                      <span className="label-eyebrow text-[var(--color-bone-400)]">
                        {config.reservationEyebrow || "Reserve a tasting"}
                      </span>
                    </div>
                  </Reveal>
                  <h1 className="font-display text-[clamp(2.4rem,5.2vw,4.8rem)] font-light leading-[1] tracking-[-0.015em] text-[var(--color-bone-50)]">
                    <RevealLines text={config.reservationHeading || "Plan your visit"} />
                    {config.reservationHeadingItalic && (
                      <RevealLines
                        text={config.reservationHeadingItalic}
                        italicLines={[0]}
                        delay={0.18}
                        className="text-[var(--color-pearl-300)]"
                      />
                    )}
                  </h1>
                  <Reveal y={14} delay={0.3} className="mt-8 max-w-md">
                    <div
                      className="body-editorial text-[var(--color-bone-300)]"
                      dangerouslySetInnerHTML={{ __html: config.reservationBody || "" }}
                    />
                  </Reveal>
                </header>

                <form onSubmit={handleSubmit} noValidate className="space-y-12">
                  {/* Group 1: Event inquiry — what kind of visit + dropdown */}
                  {eventTypes.length > 0 && (
                    <Reveal y={14} delay={0.08}>
                      <FieldGroup
                        step="01"
                        title="Event inquiry"
                        description="Tell us what brings you to the estate — wedding, corporate gathering, private tasting, or something else."
                      >
                        <FormField
                          label="What kind of event?"
                          icon={Sparkles}
                          required
                          error={touched ? errors.eventType : undefined}
                        >
                          <div className="relative">
                            <select
                              value={eventType}
                              onChange={(e) => setEventType(e.target.value)}
                              onBlur={() => setTouched(true)}
                              className={cn(
                                inputClass,
                                "appearance-none cursor-pointer pr-12"
                              )}
                            >
                              <option value="" className="bg-[var(--color-ink-900)]">
                                Select an event type…
                              </option>
                              {eventTypes.map((t) => (
                                <option
                                  key={t}
                                  value={t}
                                  className="bg-[var(--color-ink-900)]"
                                >
                                  {t}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              size={14}
                              strokeWidth={1.5}
                              aria-hidden
                              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-bone-400)]"
                            />
                          </div>
                        </FormField>
                      </FieldGroup>
                    </Reveal>
                  )}

                  {/* Group 2: Contact details */}
                  <Reveal y={14} delay={0.16}>
                    <FieldGroup
                      step={eventTypes.length > 0 ? "02" : "01"}
                      title="Contact details"
                      description="Who's coming and how we should reach you to confirm the booking."
                    >
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          label="Full name"
                          icon={UserIcon}
                          required
                          error={touched ? errors.name : undefined}
                        >
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={() => setTouched(true)}
                            placeholder="e.g. Carla van Wyk"
                            className={inputClass}
                            autoComplete="name"
                          />
                        </FormField>

                        <FormField
                          label="Email"
                          icon={Mail}
                          required
                          error={touched ? errors.email : undefined}
                        >
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onBlur={() => setTouched(true)}
                            placeholder="name@example.com"
                            className={inputClass}
                            autoComplete="email"
                          />
                        </FormField>

                        <FormField label="Phone" icon={Phone}>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+27 23 …"
                            className={inputClass}
                            autoComplete="tel"
                          />
                        </FormField>

                        <FormField label="Party size" icon={Users} required>
                          <div className="flex flex-wrap gap-2">
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => setPartySize(n)}
                                className={cn(
                                  "h-10 min-w-[40px] border px-3 label-eyebrow transition-colors",
                                  partySize === n
                                    ? "border-[var(--color-pearl-300)] bg-[var(--color-pearl-300)]/10 text-[var(--color-bone-100)]"
                                    : "border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--color-bone-300)] hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
                                )}
                                aria-pressed={partySize === n}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </FormField>
                      </div>
                    </FieldGroup>
                  </Reveal>

                  {/* Group 3: Visit details */}
                  <Reveal y={14} delay={0.24}>
                    <FieldGroup
                      step={eventTypes.length > 0 ? "03" : "02"}
                      title="Visit details"
                      description="Pick a date and time — Tue to Sat, 10:00 to 16:00."
                    >
                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField
                          label="Visit date"
                          icon={Calendar}
                          required
                          error={touched ? errors.visitDate : undefined}
                        >
                          <input
                            type="date"
                            value={visitDate}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) => setVisitDate(e.target.value)}
                            onBlur={() => setTouched(true)}
                            className={inputClass}
                          />
                        </FormField>

                        <FormField label="Time" icon={Clock} required>
                          <div className="flex flex-wrap gap-2">
                            {TIME_SLOTS.map((slot) => (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setVisitTime(slot)}
                                className={cn(
                                  "h-10 border px-3 label-eyebrow transition-colors",
                                  visitTime === slot
                                    ? "border-[var(--color-pearl-300)] bg-[var(--color-pearl-300)]/10 text-[var(--color-bone-100)]"
                                    : "border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--color-bone-300)] hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
                                )}
                                aria-pressed={visitTime === slot}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        </FormField>
                      </div>
                    </FieldGroup>
                  </Reveal>

                  {/* Group 4: Anything else */}
                  <Reveal y={14} delay={0.32}>
                    <FieldGroup
                      step={eventTypes.length > 0 ? "04" : "03"}
                      title="Anything else?"
                      description="Allergies, accessibility needs, a wine you'd like to taste — anything we should know."
                    >
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        placeholder="Optional notes (allergies, occasion, transport, …)"
                        className={cn(inputClass, "resize-y leading-relaxed")}
                      />
                    </FieldGroup>
                  </Reveal>

                  {/* Submit */}
                  <Reveal y={14} delay={0.34}>
                    <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-8 md:flex-row md:items-center md:justify-between">
                      <p className="label-eyebrow text-[var(--color-bone-500)]">
                        We'll write back within a working day.
                      </p>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={cn(
                          "group flex items-center gap-4 px-8 py-3.5 label-meta transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                          isValid
                            ? "bg-[var(--color-bone-50)] text-[var(--color-ink-900)] hover:bg-[var(--color-bone-100)]"
                            : "border border-[var(--color-bone-300)]/40 text-[var(--color-bone-100)]"
                        )}
                      >
                        {submitting ? "Sending…" : "Request reservation"}
                        <svg width="20" height="8" viewBox="0 0 20 8" fill="none" aria-hidden>
                          <path
                            d="M1 4h17m0 0L15 1m3 3l-3 3"
                            stroke="currentColor"
                            strokeWidth="1"
                            className="transition-transform duration-500 group-hover:translate-x-1"
                          />
                        </svg>
                      </button>
                    </div>
                    {serverError && (
                      <div className="mt-4 flex items-start gap-3 border border-[var(--color-wine-700)] bg-[color-mix(in_srgb,var(--color-wine-700)_10%,transparent)] p-4 text-sm text-[var(--color-bone-100)]">
                        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--color-wine-500)]" />
                        <p>{serverError}</p>
                      </div>
                    )}
                  </Reveal>
                </form>
              </section>

              {/* ── INFO SIDEBAR ────────────────────────────────── */}
              <aside className="md:sticky md:top-32 md:self-start">
                <Reveal y={14} delay={0.15}>
                  <div className="border border-[var(--border-subtle)] bg-[var(--color-ink-850)] p-6">
                    <p className="label-eyebrow text-[var(--color-bone-500)]">
                      Estate visit
                    </p>
                    <h3 className="mt-4 font-display text-2xl font-light italic text-[var(--color-pearl-300)]">
                      {config.experienceHeading || "Stay a while."}
                    </h3>
                    <div
                      className="mt-4 text-sm leading-relaxed text-[var(--color-bone-300)]"
                      dangerouslySetInnerHTML={{ __html: config.experienceBody || "Private tastings by appointment, Tuesday to Saturday." }}
                    />

                    <dl className="mt-8 space-y-4 border-t border-[var(--border-subtle)] pt-6 text-sm">
                      {(config.experienceHours || "")
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .map((line, i) => (
                          <FactRow 
                            key={i} 
                            label={i === 0 ? "Hours" : ""} 
                            value={line} 
                          />
                        ))}
                      <FactRow label="Tasting" value={config.experienceTasting} />
                      <FactRow label="Booking" value={config.experienceBooking} />
                      <FactRow
                        label="Location"
                        value={config.footerAddress}
                        icon={MapPin}
                      />
                    </dl>
                  </div>

                  <div className="mt-4 border border-[var(--border-subtle)] bg-[var(--color-ink-850)] p-6">
                    <p className="label-eyebrow text-[var(--color-bone-500)]">Or write to us</p>
                    <div className="mt-3 space-y-2 text-sm">
                      {config.footerEmail && (
                        <a
                          href={`mailto:${config.footerEmail}`}
                          className="block link-underline text-[var(--color-bone-100)]"
                        >
                          {config.footerEmail}
                        </a>
                      )}
                      {config.footerPhone && (
                        <p className="text-[var(--color-bone-300)]">{config.footerPhone}</p>
                      )}
                    </div>
                  </div>
                </Reveal>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer config={config} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

const inputClass =
  "w-full border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--color-bone-100)] transition-colors placeholder:text-[var(--color-bone-600)] focus:border-[var(--color-pearl-300)] focus:outline-none";

function FieldGroup({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-6 flex items-baseline gap-4">
        <span className="label-eyebrow text-[var(--color-bone-500)]">{step}</span>
        <div>
          <p className="font-display text-2xl font-light text-[var(--color-bone-50)]">
            {title}
          </p>
          <p className="mt-1 text-sm text-[var(--color-bone-400)]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function FormField({
  label,
  icon: Icon,
  required,
  error,
  children,
}: {
  label: string;
  icon?: any;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="label-eyebrow flex items-center gap-2 text-[var(--color-bone-500)]">
          {Icon && <Icon size={11} />}
          {label}
          {required && <span className="text-[var(--color-pearl-300)]">·</span>}
        </span>
        {error && (
          <span className="label-eyebrow text-[var(--color-wine-500)]">{error}</span>
        )}
      </div>
      {children}
    </label>
  );
}

function FactRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | undefined;
  icon?: any;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="label-eyebrow flex shrink-0 items-center gap-2 text-[var(--color-bone-500)]">
        {Icon && <Icon size={11} />}
        {label}
      </span>
      <span className="text-right text-[var(--color-bone-200)]">{value}</span>
    </div>
  );
}

function SuccessPanel({
  reservation,
  config,
}: {
  reservation: Reservation;
  config: SiteConfig;
}) {
  const dateLabel = new Date(reservation.visit_date + "T00:00:00").toLocaleDateString(
    config.defaultLanguage || "en",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );
  const ref = "LMB-" + String(reservation.id).padStart(5, "0");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-10 flex items-center gap-4">
        <span className="block h-px w-10 bg-[var(--color-pearl-300)]/60" />
        <span className="label-eyebrow text-[var(--color-bone-400)]">
          Reservation received
        </span>
      </div>

      <div className="flex h-14 w-14 items-center justify-center border border-[var(--color-pearl-300)] text-[var(--color-pearl-300)]">
        <Check size={22} />
      </div>

      <h1 className="mt-8 font-display text-[clamp(2.4rem,5.2vw,4.5rem)] font-light italic leading-[1] tracking-[-0.015em] text-[var(--color-pearl-300)]">
        {config.reservationSuccessHeading || "Thank you — see you soon."}
      </h1>

      <p className="mt-8 max-w-lg body-editorial text-[var(--color-bone-300)]">
        We've recorded your{" "}
        {reservation.event_type ? (
          <strong className="text-[var(--color-bone-100)]">{reservation.event_type.toLowerCase()}</strong>
        ) : (
          "tasting"
        )}{" "}
        request for <strong className="text-[var(--color-bone-100)]">{reservation.party_size}</strong>{" "}
        on <strong className="text-[var(--color-bone-100)]">{dateLabel}</strong> at{" "}
        <strong className="text-[var(--color-bone-100)]">{reservation.visit_time}</strong>. A
        short confirmation will follow at{" "}
        <span className="italic text-[var(--color-pearl-300)]">{reservation.email}</span>{" "}
        within one working day.
      </p>

      <dl className="mt-10 grid gap-6 border-y border-[var(--border-subtle)] py-8 sm:grid-cols-3">
        <div>
          <dt className="label-eyebrow text-[var(--color-bone-500)]">Reference</dt>
          <dd className="mt-2 font-mono text-base text-[var(--color-bone-100)]">{ref}</dd>
        </div>
        <div>
          <dt className="label-eyebrow text-[var(--color-bone-500)]">
            {reservation.event_type ? "Event" : "Status"}
          </dt>
          <dd className="mt-2 text-sm text-[var(--color-bone-100)]">
            {reservation.event_type || "Awaiting confirmation"}
          </dd>
        </div>
        <div>
          <dt className="label-eyebrow text-[var(--color-bone-500)]">Location</dt>
          <dd className="mt-2 text-sm text-[var(--color-bone-100)]">
            {config.footerAddress || "Tulbagh, Western Cape"}
          </dd>
        </div>
      </dl>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          to="/"
          className="group inline-flex items-center gap-4 border border-[var(--color-bone-300)]/40 px-7 py-3 text-[var(--color-bone-100)] transition-colors hover:bg-[var(--color-bone-50)] hover:text-[var(--color-ink-900)]"
        >
          <span className="label-meta">Return to the home page</span>
        </Link>
        {config.footerEmail && (
          <a
            href={`mailto:${config.footerEmail}?subject=Reservation%20${ref}`}
            className="label-meta link-underline text-[var(--color-bone-300)]"
          >
            Reply to this booking →
          </a>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function nextOpenDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 1) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function validateForm({
  eventType,
  name,
  email,
  visitDate,
  visitTime,
  partySize,
  knownEventTypes,
}: {
  eventType: string;
  name: string;
  email: string;
  visitDate: string;
  visitTime: string;
  partySize: number;
  /** Skip the event-type required check entirely if the editor hasn't
   *  defined any options yet — visitors shouldn't be blocked by an empty
   *  taxonomy. */
  knownEventTypes: string[];
}): Record<string, string> {
  const errs: Record<string, string> = {};
  if (knownEventTypes.length > 0 && !eventType.trim()) {
    errs.eventType = "Required";
  }
  if (!name.trim() || name.trim().length < 2) errs.name = "Required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Invalid email";
  if (!visitDate) errs.visitDate = "Required";
  else {
    const d = new Date(visitDate + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) errs.visitDate = "Past date";
    else if (d.getDay() === 0 || d.getDay() === 1)
      errs.visitDate = "Closed Sun–Mon";
  }
  if (!visitTime) errs.visitTime = "Required";
  if (partySize < 1 || partySize > 12) errs.partySize = "1–12";
  return errs;
}
