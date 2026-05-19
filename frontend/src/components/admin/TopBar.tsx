import { useState } from "react";
import {
  Menu,
  Save,
  Check,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  CircleDot,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../../lib/auth";
import type { Theme } from "../../lib/useTheme";
import type { SaveState } from "../../pages/Admin";
import { DEFAULT_STUDIO_IDENTITY, type StudioIdentity } from "../../lib/studioIdentity";

interface TopBarProps {
  onMenuClick: () => void;
  saveState: SaveState;
  dirty: boolean;
  loading: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  studio?: StudioIdentity;
}

export function TopBar({
  onMenuClick,
  saveState,
  dirty,
  loading,
  lastSaved,
  onSave,
  theme,
  onToggleTheme,
  studio,
}: TopBarProps) {
  const id = studio || DEFAULT_STUDIO_IDENTITY;
  const auth = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleSignOut() {
    auth.signOut();
    navigate("/admin/login", { replace: true });
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-ink-700)] bg-[var(--color-ink-900)] px-4 lg:px-8">
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="rounded-sm p-1 text-[var(--color-bone-300)] hover:text-[var(--color-bone-100)] lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="hidden min-w-0 md:block">
          <p className="label-eyebrow text-[var(--color-bone-500)] truncate">
            {id.tagline}
          </p>
          <p className="mt-1 truncate text-sm text-[var(--color-bone-200)]">
            {id.name} {id.edition && <span className="text-[var(--color-bone-500)]">· {id.edition}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {loading ? (
          <span className="label-eyebrow hidden text-[var(--color-bone-500)] sm:inline">
            Loading…
          </span>
        ) : dirty ? (
          <div className="hidden items-center gap-2 text-[var(--color-pearl-300)] sm:flex">
            <CircleDot size={9} className="animate-pulse" />
            <span className="label-eyebrow">Unsaved changes</span>
          </div>
        ) : lastSaved ? (
          <span className="label-eyebrow hidden text-[var(--color-bone-500)] sm:inline">
            Last published {formatTime(lastSaved)}
          </span>
        ) : null}

        <ThemeToggle theme={theme} onToggle={onToggleTheme} />

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)] sm:flex"
        >
          <ExternalLink size={13} />
          View site
        </a>

        <button
          onClick={onSave}
          disabled={saveState === "saving" || (!dirty && saveState === "idle")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 label-eyebrow transition-colors disabled:cursor-not-allowed sm:px-5",
            saveState === "saved"
              ? "bg-[var(--color-pearl-300)] text-[var(--color-ink-900)]"
              : saveState === "error"
                ? "bg-[var(--color-wine-700)] text-[var(--color-bone-50)]"
                : dirty
                  ? "bg-[var(--color-bone-50)] text-[var(--color-ink-900)] hover:bg-[var(--color-bone-100)]"
                  : "bg-[var(--color-ink-700)] text-[var(--color-bone-500)]"
          )}
        >
          {saveState === "saving" ? (
            <RefreshCw size={13} className="animate-spin" />
          ) : saveState === "saved" ? (
            <Check size={13} />
          ) : saveState === "error" ? (
            <AlertTriangle size={13} />
          ) : (
            <Save size={13} />
          )}
          <span className="hidden sm:inline">
            {saveState === "saving"
              ? "Publishing…"
              : saveState === "saved"
                ? "Published"
                : saveState === "error"
                  ? "Retry"
                  : "Publish"}
          </span>
        </button>

        {/* User menu — username pill with sign-out drawer */}
        {auth.user && (
          <div
            className="relative"
            onMouseLeave={() => setUserMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              className="flex h-9 items-center gap-2 border border-[var(--color-ink-600)] px-3 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
            >
              <UserIcon size={13} />
              <span className="hidden max-w-[140px] truncate sm:inline">
                {auth.user.username}
              </span>
            </button>

            {userMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-2 w-56 border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.7)]"
              >
                <div className="border-b border-[var(--color-ink-700)] px-4 py-3">
                  <p className="label-eyebrow text-[var(--color-bone-500)]">
                    Signed in as
                  </p>
                  <p className="mt-1 truncate text-sm text-[var(--color-bone-100)]">
                    {auth.user.username}
                  </p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[var(--color-bone-300)] transition-colors hover:bg-[var(--color-ink-800)] hover:text-[var(--color-bone-100)]"
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function formatTime(d: Date): string {
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}
