import { Link } from "react-router-dom";
import {
  Wine as WineIcon,
  CheckCircle2,
  Lock,
  CalendarRange,
  Eye,
  ArrowRight,
  Image as ImageIcon,
  BookOpen,
  Star,
  Mountain,
} from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { StatCard } from "../../components/admin/StatCard";
import { Badge, statusToTone, statusLabel } from "../../components/admin/Badge";
import { resolveAsset } from "../../services/api";
import { useAuth } from "../../lib/auth";
import { wineDefaultImage } from "../../lib/types";
import type { AdminContext } from "../Admin";

const QUICK_LINKS = [
  { to: "/admin/hero", icon: ImageIcon, label: "Hero", desc: "Opening frame & headline" },
  { to: "/admin/ribbon", icon: BookOpen, label: "Ribbon", desc: "Marquee text or image" },
  { to: "/admin/collection", icon: WineIcon, label: "Wine collection", desc: "Library, reorder, status" },
  { to: "/admin/featured", icon: Star, label: "Featured wine", desc: "Flagship showcase" },
  { to: "/admin/philosophy", icon: BookOpen, label: "Philosophy", desc: "Estate story" },
  { to: "/admin/estate", icon: Mountain, label: "Estate", desc: "Valley & terroir" },
];

export function Dashboard({ ctx }: { ctx: AdminContext }) {
  const { wines, lastSaved, dirty } = ctx;
  const auth = useAuth();

  const available = wines.filter((w) => w.status === "available").length;
  const allocated = wines.filter((w) => w.status === "allocated").length;
  const vintages = new Set(wines.map((w) => w.vintage).filter(Boolean)).size;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <PageHeader
        eyebrow={`Welcome back · ${today}`}
        title="Studio dashboard"
        description="Edit every section of the public site, manage the wine collection, and publish changes — all from here."
      >
        <Link
          to="/admin/preview"
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <Eye size={13} /> Open live preview
        </Link>
      </PageHeader>

      <div className="space-y-6 p-5 lg:p-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={WineIcon}
            label="Total wines"
            value={wines.length}
            hint="In the public collection"
            accent="pearl"
          />
          <StatCard
            icon={CheckCircle2}
            label="Available"
            value={available}
            hint={`${available} of ${wines.length} on offer`}
          />
          <StatCard
            icon={Lock}
            label="Allocated"
            value={allocated}
            hint="By appointment only"
            accent="wine"
          />
          <StatCard
            icon={CalendarRange}
            label="Vintages"
            value={vintages}
            hint="Distinct release years"
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <Card
            title="Quick edit"
            description="Jump directly to the sections you most often touch."
            className="lg:col-span-2"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {QUICK_LINKS.map((q) => {
                const Icon = q.icon;
                return (
                  <Link
                    key={q.to}
                    to={q.to}
                    className="group flex items-start gap-3 border border-[var(--color-ink-700)] bg-[var(--color-ink-850)] p-4 transition-colors hover:border-[var(--color-bone-400)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--color-ink-600)] bg-[var(--color-ink-900)] text-[var(--color-pearl-300)]">
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base text-[var(--color-bone-100)]">
                        {q.label}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-bone-400)]">
                        {q.desc}
                      </p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="mt-1 text-[var(--color-bone-600)] transition-colors group-hover:text-[var(--color-bone-200)]"
                    />
                  </Link>
                );
              })}
            </div>
          </Card>

          <Card title="Site status" description="Publishing snapshot.">
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="label-eyebrow text-[var(--color-bone-500)]">State</dt>
                <dd className="mt-2 flex items-center gap-2">
                  {dirty ? (
                    <Badge tone="allocated">Unsaved changes</Badge>
                  ) : (
                    <Badge tone="available">Up to date</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="label-eyebrow text-[var(--color-bone-500)]">Last published</dt>
                <dd className="mt-2 text-[var(--color-bone-200)]">
                  {lastSaved
                    ? lastSaved.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Not in this session"}
                </dd>
              </div>
              <div>
                <dt className="label-eyebrow text-[var(--color-bone-500)]">
                  Signed in as
                </dt>
                <dd className="mt-2 truncate text-[var(--color-bone-200)]">
                  {auth.user?.username || "—"}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <Card
          title="Wine collection"
          description="The six wines visible on the landing page, in order."
          action={
            <Link
              to="/admin/collection"
              className="flex items-center gap-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:text-[var(--color-bone-100)]"
            >
              Manage all <ArrowRight size={13} />
            </Link>
          }
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {wines.slice(0, 6).map((w) => (
              <div
                key={w.id}
                className="group overflow-hidden border border-[var(--color-ink-700)] bg-[var(--color-ink-850)]"
              >
                <div className="aspect-[4/5] overflow-hidden bg-[var(--color-ink-900)]">
                  {wineDefaultImage(w) && (
                    <img
                      src={resolveAsset(wineDefaultImage(w))}
                      alt={w.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate font-display text-sm text-[var(--color-bone-100)]">
                    {w.name}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="label-eyebrow text-[var(--color-bone-500)]">
                      {w.vintage || "—"}
                    </span>
                    <Badge tone={statusToTone(w.status)}>
                      {statusLabel(w.status)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
