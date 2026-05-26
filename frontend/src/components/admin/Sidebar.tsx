import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Image as ImageIcon,
  BookOpen,
  Wine as WineIcon,
  Star,
  Award,
  Mountain,
  CalendarDays,
  Users,
  PanelBottom,
  Eye,
  ExternalLink,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Layers,
  Building2,
  ShieldCheck,
  Activity,
  UserCog,
  LogOut,
  X,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import type { LucideIcon } from "lucide-react";
import { Monogram } from "../Monogram";
import { cn } from "../../lib/utils";
import { DEFAULT_STUDIO_IDENTITY, type StudioIdentity } from "../../lib/studioIdentity";
import { resolveAsset } from "../../services/api";

interface NavItemDef {
  to: string;
  end?: boolean;
  icon: LucideIcon;
  label: string;
}

const CONTENT_ITEMS: NavItemDef[] = [
  { to: "/admin/brand", icon: Sparkles, label: "Brand" },
  { to: "/admin/hero", icon: ImageIcon, label: "Hero" },
  { to: "/admin/philosophy", icon: BookOpen, label: "Philosophy" },
  { to: "/admin/ribbon", icon: Layers, label: "Varietal ribbon" },
  { to: "/admin/collection", icon: WineIcon, label: "Wine collection" },
  { to: "/admin/featured", icon: Star, label: "Featured wine" },
  { to: "/admin/awarding", icon: Award, label: "Awarding section" },
  { to: "/admin/testimonials", icon: Users, label: "Testimonials" },
  { to: "/admin/estate", icon: Mountain, label: "Estate" },
  { to: "/admin/experience", icon: CalendarDays, label: "Experience" },
  { to: "/admin/club", icon: Users, label: "Wine club" },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/footer", icon: PanelBottom, label: "Footer" },
];

const TOOL_ITEMS: NavItemDef[] = [
  { to: "/admin/menu", icon: MenuIcon, label: "Header menu" },
  { to: "/admin/templates", icon: Layers, label: "Template themes" },
  { to: "/admin/studio", icon: Building2, label: "Studio identity" },
  { to: "/admin/age-gate", icon: ShieldCheck, label: "Age verification" },
  { to: "/admin/preview", icon: Eye, label: "Live preview" },
  { to: "/admin/settings", icon: SettingsIcon, label: "Settings" },
];

const SYSTEM_ITEMS: NavItemDef[] = [
  { to: "/admin/users", icon: UserCog, label: "User accounts" },
  { to: "/admin/audit", icon: Activity, label: "Activity log" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  studio?: StudioIdentity;
  dirty?: boolean;
}

export function Sidebar({ open, onClose, studio, dirty }: SidebarProps) {
  const auth = useAuth();
  const navigate = useNavigate();
  const id = studio || DEFAULT_STUDIO_IDENTITY;
  const logoUrl = id.logo ? resolveAsset(id.logo) : "";

  function handleSignOut() {
    auth.signOut();
    navigate("/admin/login", { replace: true });
  }

  return (
    <>
      {open && (
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-[rgba(7,7,10,0.7)] backdrop-blur-sm lg:hidden"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] shrink-0 flex-col border-r border-[var(--color-ink-700)] bg-[var(--color-ink-950)] transition-transform duration-300 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-ink-700)] px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 object-contain"
              />
            ) : (
              <Monogram className="h-8 w-auto shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-display text-lg leading-none tracking-tight text-[var(--color-bone-100)] truncate">
                {id.name}
              </p>
              <p className="label-eyebrow mt-1.5 text-[var(--color-bone-500)] truncate">
                {id.edition}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="text-[var(--color-bone-400)] hover:text-[var(--color-bone-100)] lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-5">
          <NavGroup title="Overview">
            <NavItem 
              item={{ to: "/admin", end: true, icon: LayoutDashboard, label: "Dashboard" }} 
              indicator={dirty ? "dirty" : undefined}
            />
          </NavGroup>

          <NavGroup title="Content sections">
            {CONTENT_ITEMS.map((item) => (
              <NavItem key={item.to} item={item} />
            ))}
          </NavGroup>

          {auth.user?.role === "admin" && (
            <NavGroup title="Tools">
              {TOOL_ITEMS.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="-ml-[2px] flex items-center gap-3 border-l-2 border-transparent pl-[10px] py-2 pr-3 text-sm text-[var(--color-bone-400)] transition-colors hover:bg-[var(--color-ink-700)] hover:text-[var(--color-bone-100)]"
              >
                <ExternalLink size={15} className="shrink-0" />
                <span className="font-sans tracking-wide">View public site</span>
              </a>
            </NavGroup>
          )}

          {auth.user?.role === "admin" && (
            <NavGroup title="System">
              {SYSTEM_ITEMS.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </NavGroup>
          )}
        </nav>

        <div className="border-t border-[var(--color-ink-700)] px-5 py-4">
          <p className="label-eyebrow text-[var(--color-bone-600)]">Signed in as</p>
          <p className="mt-2 truncate text-sm text-[var(--color-bone-200)]">
            {auth.user?.username || "—"}
          </p>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 inline-flex items-center gap-2 label-eyebrow text-[var(--color-bone-500)] transition-colors hover:text-[var(--color-bone-100)]"
          >
            <LogOut size={11} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="label-eyebrow px-3 pb-2 text-[var(--color-bone-600)]">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({ item, indicator }: { item: NavItemDef; indicator?: "dirty" }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "-ml-[2px] flex items-center gap-3 border-l-2 py-2 pl-[10px] pr-3 text-sm transition-colors relative",
          isActive
            ? "border-[var(--color-pearl-300)] bg-[var(--color-ink-700)] text-[var(--color-bone-100)]"
            : "border-transparent text-[var(--color-bone-400)] hover:bg-[var(--color-ink-700)] hover:text-[var(--color-bone-100)]"
        )
      }
    >
      <Icon size={15} className="shrink-0" />
      <span className="font-sans tracking-wide">{item.label}</span>
      {indicator === "dirty" && (
        <span className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[var(--color-wine-500)] shadow-[0_0_8px_rgba(185,72,60,0.5)]" />
      )}
    </NavLink>
  );
}
