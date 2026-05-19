import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Link2,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";
import { TextField, SelectField, ImageField } from "./Field";
import { ToggleField } from "./ToggleField";
import {
  MENU_KIND_LABEL,
  MENU_KIND_HINT,
  slugify,
  type MenuItem,
  type MenuItemNode,
  type MenuKind,
} from "../../lib/types";
import { cn } from "../../lib/utils";

interface MenuEditorProps {
  tree: MenuItemNode[];
  onCreate: (item: Partial<MenuItem>) => Promise<void>;
  onUpdate: (id: number, patch: Partial<MenuItem>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onReorderTop: (next: MenuItemNode[]) => Promise<void>;
  onReorderChildren: (parentId: number, next: MenuItem[]) => Promise<void>;
}

export function MenuEditor({
  tree,
  onCreate,
  onUpdate,
  onDelete,
  onReorderTop,
  onReorderChildren,
}: MenuEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleTopDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tree.findIndex((n) => n.id === active.id);
    const newIndex = tree.findIndex((n) => n.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderTop(arrayMove(tree, oldIndex, newIndex));
  }

  return (
    <div className="space-y-4">
      {tree.length === 0 ? (
        <div className="border border-dashed border-[var(--color-ink-600)] bg-[var(--color-ink-850)] p-10 text-center">
          <p className="font-display text-lg text-[var(--color-bone-200)]">
            No menu items yet.
          </p>
          <p className="mt-1 text-sm text-[var(--color-bone-500)]">
            Add a top-level item to start.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTopDragEnd}
        >
          <SortableContext
            items={tree.map((n) => n.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {tree.map((node) => (
                <MenuItemCard
                  key={node.id}
                  node={node}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onCreate={onCreate}
                  onReorderChildren={onReorderChildren}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

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
        className="flex w-full items-center justify-center gap-2 border border-dashed border-[var(--color-ink-600)] py-4 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-pearl-300)] hover:text-[var(--color-bone-100)]"
      >
        <Plus size={14} /> Add top-level item
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface MenuItemCardProps {
  node: MenuItemNode;
  onUpdate: (id: number, patch: Partial<MenuItem>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onCreate: (item: Partial<MenuItem>) => Promise<void>;
  onReorderChildren: (parentId: number, next: MenuItem[]) => Promise<void>;
}

function MenuItemCard({
  node,
  onUpdate,
  onDelete,
  onCreate,
  onReorderChildren,
}: MenuItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const [open, setOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleChildDragEnd(event: any) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = node.children.findIndex((c) => c.id === active.id);
    const newIndex = node.children.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderChildren(node.id, arrayMove(node.children, oldIndex, newIndex));
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-hidden border border-[var(--color-ink-700)] bg-[var(--color-ink-850)]"
    >
      <RowHeader
        item={node}
        attributes={attributes}
        listeners={listeners}
        open={open}
        onToggleOpen={() => setOpen((v) => !v)}
        onUpdate={onUpdate}
        onDelete={onDelete}
        showChildBadge
        childCount={node.children.length}
      />

      {open && (
        <div className="border-t border-[var(--color-ink-700)] bg-[var(--color-ink-900)] p-6">
          <ItemForm item={node} onUpdate={onUpdate} />
        </div>
      )}

      {/* Children */}
      <div className="border-t border-[var(--color-ink-700)] bg-[var(--color-ink-850)] pb-3 pl-8 pr-3 pt-3">
        <p className="label-eyebrow mb-3 ml-1 text-[var(--color-bone-500)]">
          Submenu ({node.children.length})
        </p>

        {node.children.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleChildDragEnd}
          >
            <SortableContext
              items={node.children.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {node.children.map((child) => (
                  <ChildRow
                    key={child.id}
                    item={child}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        <button
          onClick={() =>
            onCreate({
              label: "New sub-item",
              kind: "anchor",
              target: "#",
              parent_id: node.id,
              isVisible: true,
            })
          }
          className="mt-2 flex w-full items-center justify-center gap-2 border border-dashed border-[var(--color-ink-600)] py-3 label-eyebrow text-[var(--color-bone-400)] transition-colors hover:border-[var(--color-pearl-300)] hover:text-[var(--color-bone-100)]"
        >
          <Plus size={12} /> Add sub-item under {node.label}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface ChildRowProps {
  item: MenuItem;
  onUpdate: (id: number, patch: Partial<MenuItem>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

function ChildRow({ item, onUpdate, onDelete }: ChildRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const [open, setOpen] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="overflow-hidden border border-[var(--color-ink-700)] bg-[var(--color-ink-900)]"
    >
      <RowHeader
        item={item}
        attributes={attributes}
        listeners={listeners}
        open={open}
        onToggleOpen={() => setOpen((v) => !v)}
        onUpdate={onUpdate}
        onDelete={onDelete}
        compact
      />

      {open && (
        <div className="border-t border-[var(--color-ink-700)] bg-[var(--color-ink-850)] p-5">
          <ItemForm item={item} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

interface RowHeaderProps {
  item: MenuItem;
  attributes: any;
  listeners: any;
  open: boolean;
  onToggleOpen: () => void;
  onUpdate: (id: number, patch: Partial<MenuItem>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  compact?: boolean;
  showChildBadge?: boolean;
  childCount?: number;
}

function RowHeader({
  item,
  attributes,
  listeners,
  open,
  onToggleOpen,
  onUpdate,
  onDelete,
  compact,
  showChildBadge,
  childCount,
}: RowHeaderProps) {
  const KindIcon =
    item.kind === "page"
      ? FileText
      : item.kind === "external"
        ? ExternalLink
        : Link2;

  return (
    <div className={cn("flex items-center gap-3", compact ? "p-3" : "p-4")}>
      <button
        {...attributes}
        {...listeners}
        aria-label="Reorder"
        className="flex h-8 w-5 cursor-grab items-center justify-center text-[var(--color-bone-500)] hover:text-[var(--color-pearl-300)] active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>

      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[var(--color-ink-700)] bg-[var(--color-ink-900)] text-[var(--color-bone-300)]">
        <KindIcon size={13} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={cn(
              "truncate font-display leading-tight text-[var(--color-bone-100)]",
              compact ? "text-sm" : "text-base"
            )}
          >
            {item.label || "Untitled"}
          </p>
          {!item.isVisible && (
            <span className="label-eyebrow text-[var(--color-bone-500)]">Hidden</span>
          )}
          {showChildBadge && childCount! > 0 && (
            <span className="label-eyebrow text-[var(--color-pearl-300)]">
              {childCount} sub
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--color-bone-500)]">
          {MENU_KIND_LABEL[item.kind]} · <span className="font-mono">{item.target || "—"}</span>
        </p>
      </div>

      <button
        onClick={() => onUpdate(item.id, { isVisible: !item.isVisible })}
        aria-label={item.isVisible ? "Hide" : "Show"}
        className={cn(
          "flex h-9 w-9 items-center justify-center border transition-colors",
          item.isVisible
            ? "border-[var(--color-ink-600)] text-[var(--color-bone-300)] hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
            : "border-[var(--color-ink-600)] text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)]"
        )}
        title={item.isVisible ? "Hide from menu" : "Show in menu"}
      >
        {item.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>

      <button
        onClick={onToggleOpen}
        className="flex items-center gap-2 border border-[var(--color-ink-600)] px-3 py-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:border-[var(--color-bone-400)] hover:text-[var(--color-bone-100)]"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        <span className="hidden sm:inline">{open ? "Close" : "Edit"}</span>
      </button>

      <button
        onClick={() => {
          if (confirm(`Delete "${item.label}"? Sub-items will also be removed.`)) {
            onDelete(item.id);
          }
        }}
        aria-label="Delete"
        className="text-[var(--color-bone-500)] transition-colors hover:text-[var(--color-wine-500)]"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */

function ItemForm({
  item,
  onUpdate,
}: {
  item: MenuItem;
  onUpdate: (id: number, patch: Partial<MenuItem>) => Promise<void>;
}) {
  const kind = (item.kind || "anchor") as MenuKind;

  const targetLabel =
    kind === "anchor"
      ? "Section anchor (e.g. #collection)"
      : kind === "page"
        ? "Page slug (e.g. our-story)"
        : "External URL";

  function setKind(next: MenuKind) {
    // Reset target to sensible default when switching kinds
    const defaultTarget =
      next === "anchor" ? "#" : next === "external" ? "https://" : slugify(item.label);
    onUpdate(item.id, { kind: next, target: defaultTarget });
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 md:grid-cols-2">
        <TextField
          label="Label"
          value={item.label || ""}
          onChange={(v) => onUpdate(item.id, { label: v })}
          placeholder="Collection"
        />
        <SelectField
          label="Kind"
          value={kind}
          onChange={(v) => setKind(v as MenuKind)}
          options={[
            { value: "anchor", label: "Section anchor" },
            { value: "page", label: "Generated page" },
            { value: "external", label: "External link" },
          ]}
          hint={MENU_KIND_HINT[kind]}
        />
      </div>

      <TextField
        label={targetLabel}
        value={item.target || ""}
        onChange={(v) =>
          onUpdate(item.id, {
            target: kind === "page" ? slugify(v) : v,
          })
        }
        placeholder={
          kind === "anchor" ? "#collection" : kind === "page" ? "our-story" : "https://shop.example.com"
        }
        hint={
          kind === "page"
            ? `Will be reachable at /page/${slugify(item.target || "")}`
            : undefined
        }
      />

      <div className="border border-[var(--border-default)] bg-[var(--bg-input)] px-4">
        <ToggleField
          label="Visible in menu"
          description={
            item.isVisible
              ? "Currently shown in the public header."
              : "Hidden — saved here but not rendered on the public site."
          }
          value={Boolean(item.isVisible)}
          onChange={(b) => onUpdate(item.id, { isVisible: b })}
        />
      </div>

      {kind === "page" && (
        <div className="border-t border-[var(--color-ink-700)] pt-5">
          <p className="label-eyebrow mb-4 text-[var(--color-bone-500)]">
            Page content
          </p>
          <div className="grid gap-5">
            <TextField
              label="Eyebrow"
              value={item.pageEyebrow || ""}
              onChange={(v) => onUpdate(item.id, { pageEyebrow: v })}
              placeholder="Letter 17"
            />
            <TextField
              label="Page heading"
              value={item.pageHeading || ""}
              onChange={(v) => onUpdate(item.id, { pageHeading: v })}
              placeholder="A long, quiet harvest."
            />
            <TextField
              label="Body"
              multiline
              rows={8}
              value={item.pageBody || ""}
              onChange={(v) => onUpdate(item.id, { pageBody: v })}
              hint="Use two newlines for paragraph breaks."
            />
            <ImageField
              label="Hero image"
              value={item.pageImage || ""}
              onChange={(v) => onUpdate(item.id, { pageImage: v })}
              aspect="aspect-video"
            />
            <a
              href={`/page/${item.target}`}
              target="_blank"
              rel="noreferrer"
              className="self-start flex items-center gap-2 label-eyebrow text-[var(--color-bone-300)] transition-colors hover:text-[var(--color-bone-100)]"
            >
              <ExternalLink size={12} /> Preview /page/{item.target}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
