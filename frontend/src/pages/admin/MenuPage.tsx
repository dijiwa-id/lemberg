import { useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { MenuEditor } from "../../components/admin/MenuEditor";
import {
  createMenuItem,
  deleteMenuItem,
  errorMessage,
  fetchMenu,
  reorderMenu,
  updateMenuItem,
} from "../../services/api";
import { useToast } from "../../lib/toast";
import type { MenuItem, MenuItemNode } from "../../lib/types";

export function MenuPage() {
  const [tree, setTree] = useState<MenuItemNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const toast = useToast();

  // Load on mount + refresh
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchMenu()
      .then((t) => {
        if (alive) setTree(t);
      })
      .catch((e) => {
        if (!alive) return;
        setTree([]);
        toast.error("Could not load the menu", errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [refreshTick, toast]);

  const refresh = () => setRefreshTick((t) => t + 1);

  async function onCreate(partial: Partial<MenuItem>) {
    try {
      await createMenuItem(partial);
      refresh();
    } catch (e) {
      toast.error("Could not add menu item", errorMessage(e));
    }
  }

  async function onUpdate(id: number, patch: Partial<MenuItem>) {
    // Optimistic — patch local tree, then call API.
    setTree((cur) =>
      cur.map((node) => {
        if (node.id === id) return { ...node, ...patch } as MenuItemNode;
        if (node.children.some((c) => c.id === id)) {
          return {
            ...node,
            children: node.children.map((c) =>
              c.id === id ? { ...c, ...patch } : c
            ),
          };
        }
        return node;
      })
    );
    try {
      await updateMenuItem(id, patch);
    } catch (e) {
      toast.error("Could not save menu item", errorMessage(e));
      refresh();
    }
  }

  async function onDelete(id: number) {
    try {
      await deleteMenuItem(id);
      refresh();
    } catch (e) {
      toast.error("Could not delete menu item", errorMessage(e));
    }
  }

  async function onReorderTop(next: MenuItemNode[]) {
    const withOrder = next.map((n, i) => ({ ...n, order: i }));
    setTree(withOrder);
    try {
      await reorderMenu(
        withOrder.map((n) => ({
          id: n.id,
          parent_id: null,
          order: n.order,
        }))
      );
    } catch (e) {
      toast.error("Reorder did not persist", errorMessage(e));
      refresh();
    }
  }

  async function onReorderChildren(parentId: number, next: MenuItem[]) {
    const withOrder = next.map((c, i) => ({ ...c, order: i }));
    setTree((cur) =>
      cur.map((n) => (n.id === parentId ? { ...n, children: withOrder } : n))
    );
    try {
      await reorderMenu(
        withOrder.map((c) => ({
          id: c.id,
          parent_id: parentId,
          order: c.order,
        }))
      );
    } catch (e) {
      toast.error("Reorder did not persist", errorMessage(e));
      refresh();
    }
  }

  const totalItems =
    tree.length + tree.reduce((sum, n) => sum + n.children.length, 0);

  return (
    <>
      <PageHeader
        eyebrow="Studio"
        title="Header menu"
        description="Add, edit, reorder, hide, or delete header navigation items. Each item can be a section anchor, a generated page, or an external link. Drag to reorder; expand to edit."
      >
        <button
          onClick={refresh}
          className="flex items-center gap-2 border border-[var(--color-ink-600)] px-4 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
        >
          <RefreshCw size={13} /> Refresh
        </button>
        <button
          onClick={() =>
            onCreate({
              label: "New menu item",
              kind: "anchor",
              target: "#",
              parent_id: null,
              isVisible: true,
            })
          }
          className="flex items-center gap-2 bg-[var(--color-bone-50)] px-4 py-2 label-eyebrow text-[var(--color-ink-900)] transition-colors hover:bg-[var(--color-bone-100)]"
        >
          <Plus size={13} /> Add item
        </button>
      </PageHeader>

      <div className="space-y-6 p-5 lg:p-10">
        <Card
          title={`Menu structure (${totalItems})`}
          description="Drag the grip to reorder. Click Edit to expand a row and change kind, target, or page content. Use Hide to keep an item without showing it."
        >
          {loading ? (
            <p className="label-eyebrow text-[var(--color-bone-500)]">Loading menu…</p>
          ) : (
            <MenuEditor
              tree={tree}
              onCreate={onCreate}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onReorderTop={onReorderTop}
              onReorderChildren={onReorderChildren}
            />
          )}
        </Card>

        <Card
          title="Tips"
          description="How each menu kind behaves on the public site."
        >
          <ul className="space-y-3 text-sm text-[var(--color-bone-300)]">
            <li>
              <span className="label-eyebrow text-[var(--color-pearl-300)]">Anchor</span>
              <span className="ml-3">
                Smooth-scrolls to a section's <code className="font-mono text-[var(--color-bone-200)]">id</code> on
                the landing page. Example target:{" "}
                <code className="font-mono text-[var(--color-bone-200)]">#experience</code>.
              </span>
            </li>
            <li>
              <span className="label-eyebrow text-[var(--color-pearl-300)]">Page</span>
              <span className="ml-3">
                Generates a new page at{" "}
                <code className="font-mono text-[var(--color-bone-200)]">/page/{`{slug}`}</code> with the heading, body
                and image you supply.
              </span>
            </li>
            <li>
              <span className="label-eyebrow text-[var(--color-pearl-300)]">External</span>
              <span className="ml-3">
                Opens the URL in a new tab. Use a full URL including{" "}
                <code className="font-mono text-[var(--color-bone-200)]">https://</code>.
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
