import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, AlertTriangle, Lock, User } from "lucide-react";
import { Monogram } from "../../components/Monogram";
import { useAuth } from "../../lib/auth";
import { errorMessage, fetchSetupNeeded } from "../../services/api";
import { getCachedBrand } from "../../lib/brandCache";
import { getCachedStudio } from "../../lib/studioIdentity";
import { resolveAsset } from "../../services/api";
import { fontStack, useGoogleFont } from "../../lib/useGoogleFont";

type Mode = "checking" | "login" | "setup";

/**
 * Studio sign-in. Doubles as the first-time setup form: on initial deploy
 * the `users` table is empty, so the page polls `/api/auth/setup-needed`
 * and switches to "Create administrator" mode automatically. Once that
 * first user exists, every subsequent visit lands on the regular login.
 */
export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Already signed in → bounce straight to /admin (preserving ?next=).
  const params = new URLSearchParams(location.search);
  const nextPath = params.get("next") || "/admin";

  const [mode, setMode] = useState<Mode>("checking");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Splash brand cache so the login matches the editor's published wordmark.
  const brand = getCachedBrand();
  const studio = getCachedStudio();
  const studioLogoUrl = studio.logo ? resolveAsset(studio.logo) : "";
  useGoogleFont(brand.logoFont ? [brand.logoFont] : []);

  useEffect(() => {
    let alive = true;
    fetchSetupNeeded()
      .then((s) => {
        if (alive) setMode(s.needed ? "setup" : "login");
      })
      .catch(() => {
        // If the API is unreachable, default to the login form so the
        // user gets a sensible error on submit rather than a stuck spinner.
        if (alive) setMode("login");
      });
    return () => {
      alive = false;
    };
  }, []);

  // Already signed in? Don't show the form — go straight back to /admin.
  if (!auth.loading && auth.user) {
    return <Navigate to={nextPath} replace />;
  }

  const isSetup = mode === "setup";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSetup) {
        await auth.signUpFirstAdmin(username, password);
      } else {
        await auth.signIn(username, password);
      }
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      data-theme="dark"
      className="relative flex min-h-[100vh] min-h-[100dvh] items-center justify-center overscroll-none bg-[var(--color-ink-950)] px-6 py-12 text-[var(--color-bone-100)]"
    >
      {/* Iridescent atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,196,187,0.10)_0%,_transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--color-bone-100) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[440px]"
      >
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-5">
          {studioLogoUrl ? (
            <img
              src={studioLogoUrl}
              alt=""
              className="h-12 w-12 object-contain"
            />
          ) : (
            <Monogram className="h-12 w-auto" />
          )}
          <span
            className="text-xl font-light uppercase leading-none tracking-[0.32em] text-[var(--color-bone-100)]"
            style={{
              fontFamily: fontStack(brand.logoFont, "var(--font-display)"),
            }}
          >
            {studio.name}
          </span>
          <span className="label-eyebrow text-[var(--color-bone-500)]">
            {studio.tagline} · {studio.edition}
          </span>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-10 border border-[var(--border-subtle)] bg-[var(--color-ink-900)]/85 p-7 backdrop-blur-md sm:p-9"
        >
          {mode === "checking" ? (
            <div className="flex h-40 items-center justify-center">
              <span className="label-eyebrow text-[var(--color-bone-500)]">
                Checking…
              </span>
            </div>
          ) : (
            <>
              <header className="mb-7">
                <p className="label-eyebrow text-[var(--color-bone-500)]">
                  {isSetup ? "First-time setup" : "Welcome back"}
                </p>
                <h1 className="mt-3 font-display text-3xl font-light italic text-[var(--color-pearl-300)]">
                  {isSetup ? "Create your administrator." : "Sign in to the studio."}
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-[var(--color-bone-400)]">
                  {isSetup
                    ? "No editor exists yet. Choose a username and a strong password — you'll use these every time you publish."
                    : "Enter your credentials to manage content, wines, menus, and reservations."}
                </p>
              </header>

              <div className="space-y-5">
                <FieldRow
                  label="Username"
                  icon={User}
                  htmlFor="username"
                  hint={isSetup ? "At least 3 characters." : undefined}
                >
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={submitting}
                    className={INPUT_CLASS}
                  />
                </FieldRow>

                <FieldRow
                  label="Password"
                  icon={Lock}
                  htmlFor="password"
                  hint={isSetup ? "At least 8 characters." : undefined}
                >
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={isSetup ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    className={INPUT_CLASS}
                  />
                </FieldRow>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-3 border border-[var(--color-wine-700)] bg-[color-mix(in_srgb,var(--color-wine-700)_12%,transparent)] p-4 text-sm text-[var(--color-bone-100)]"
                >
                  <AlertTriangle
                    size={14}
                    className="mt-0.5 shrink-0 text-[var(--color-wine-500)]"
                  />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-7 inline-flex w-full items-center justify-center gap-4 bg-[var(--color-bone-50)] px-7 py-3.5 label-meta text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? isSetup
                    ? "Creating account…"
                    : "Signing in…"
                  : isSetup
                    ? "Create administrator"
                    : "Sign in"}
                <svg width="20" height="8" viewBox="0 0 20 8" fill="none" aria-hidden>
                  <path
                    d="M1 4h17m0 0L15 1m3 3l-3 3"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                </svg>
              </button>

              <p className="mt-6 text-center label-eyebrow text-[var(--color-bone-500)]">
                {isSetup
                  ? "This account becomes the master editor."
                  : "Lost access? Ask another editor — admin recovery requires server access."}
              </p>
            </>
          )}
        </form>

        <Link
          to="/"
          className="mt-8 flex items-center justify-center gap-2 label-eyebrow text-[var(--color-bone-500)] transition-colors hover:text-[var(--color-bone-100)]"
        >
          <ArrowLeft size={11} /> Return to the public site
        </Link>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

const INPUT_CLASS =
  "w-full border border-[var(--border-default)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--color-bone-100)] transition-colors placeholder:text-[var(--color-bone-600)] focus:border-[var(--color-pearl-300)] focus:outline-none disabled:opacity-60";

function FieldRow({
  label,
  icon: Icon,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  icon: typeof User;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="label-eyebrow flex items-center gap-2 text-[var(--color-bone-500)]">
        <Icon size={11} />
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {hint && (
        <span className="mt-2 block text-[11px] text-[var(--color-bone-500)]">
          {hint}
        </span>
      )}
    </label>
  );
}
