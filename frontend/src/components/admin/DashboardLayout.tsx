import { useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AdminFooter } from "./AdminFooter";
import { useTheme } from "../../lib/useTheme";
import type { SaveState } from "../../pages/Admin";
import type { StudioIdentity } from "../../lib/studioIdentity";

interface Props {
  children: ReactNode;
  saveState: SaveState;
  dirty: boolean;
  loading: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  /** Identity for the chrome (Sidebar/TopBar/AdminFooter). Optional — each
   *  child has internal fallbacks so a missing identity won't crash the
   *  studio if Admin hasn't computed it yet on first paint. */
  studio?: StudioIdentity;
}

export function DashboardLayout({
  children,
  saveState,
  dirty,
  loading,
  lastSaved,
  onSave,
  studio,
}: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggle } = useTheme();

  return (
    <div
      data-theme={theme}
      /* Shell height notes:
         - `h-[100dvh]` is dynamic viewport height — accounts for mobile
           browser chrome (URL bar) collapsing/expanding without leaving a
           sliver of content below the visible area. Fallback to `100vh`
           is needed on older Safari (<= 15.4) where dvh isn't supported.
         - `overflow-hidden` confines all scroll to the inner <main>.
         - `overscroll-none` belts-and-braces — even if a child scroller
           somehow propagates, the shell stops the rubber-band.
      */
      className="flex h-[100vh] h-[100dvh] w-screen overflow-hidden overscroll-none bg-[var(--color-ink-900)] text-[var(--color-bone-100)]"
    >
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        studio={studio}
        dirty={dirty}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          onMenuClick={() => setSidebarOpen((v) => !v)}
          saveState={saveState}
          dirty={dirty}
          loading={loading}
          lastSaved={lastSaved}
          onSave={onSave}
          theme={theme}
          onToggleTheme={toggle}
          studio={studio}
        />
        {/*
          Inner wrapper uses `min-h-full flex-col` so:
          - Short pages (Dashboard, Brand, Club) push the AdminFooter down
            to the bottom of the viewport instead of leaving a slab of
            empty bg-ink-900 below the last card.
          - Long pages (Collection, Settings) place the footer naturally
            at the end of the content stream.

          `overscroll-contain` on <main> stops momentum scroll past the
          content edges from bouncing the whole document — without it,
          iOS/macOS rubber-banding leaks past the layout and looks like
          the app itself is overscrolling.
        */}
        <main className="flex-1 overflow-y-auto overscroll-contain bg-[var(--color-ink-900)]">
          <div className="flex min-h-full flex-col">
            <div className="flex-1">{children}</div>
            <AdminFooter studio={studio} />
          </div>
        </main>
      </div>
    </div>
  );
}
