import { useEffect, useState } from "react";
import { UserPlus, Shield, UserX, UserCheck, Key, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { TextField } from "../../components/admin/Field";
import { SelectField } from "../../components/admin/Field";
import { fetchUsers, createUser, updateUser, deleteUser, errorMessage } from "../../services/api";
import type { User } from "../../lib/types";
import type { AdminContext } from "../Admin";
import { cn } from "../../lib/utils";

export function UsersPage({ ctx }: { ctx: AdminContext }) {
  const { user: currentUser } = ctx;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd() {
    if (!newUsername || !newPassword) return;
    setBusy(true);
    setError(null);
    try {
      await createUser({ username: newUsername, password: newPassword, role: newRole });
      setNewUsername("");
      setNewPassword("");
      setShowAdd(false);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(u: User) {
    if (u.id === currentUser?.id) return;
    setBusy(true);
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleRole(u: User) {
    if (u.id === currentUser?.id) return;
    setBusy(true);
    const newRole = u.role === "admin" ? "editor" : "admin";
    try {
      await updateUser(u.id, { role: newRole });
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(u: User) {
    if (u.id === currentUser?.id) return;
    if (!window.confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteUser(u.id);
      load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center p-10 text-center">
        <Shield size={48} className="mb-4 text-[var(--color-wine-500)] opacity-20" />
        <h2 className="text-xl font-display text-[var(--color-bone-100)]">Restricted Access</h2>
        <p className="mt-2 max-w-sm text-sm text-[var(--color-bone-500)] leading-relaxed">
          Only users with the <span className="text-[var(--color-bone-200)] font-semibold">admin</span> role can manage studio accounts.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="User Management"
        description="Manage studio accounts and access levels. Admins can manage all users; Editors can manage content but not system settings."
      />

      <div className="space-y-6 p-5 lg:p-10">
        {error && (
          <div className="border border-[var(--color-wine-800)]/30 bg-[var(--color-wine-950)]/20 p-4 text-sm text-[var(--color-wine-400)] italic">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-ink-700)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-bone-500)]">
                      <th className="px-4 py-4 font-semibold">Username</th>
                      <th className="px-4 py-4 font-semibold">Role</th>
                      <th className="px-4 py-4 font-semibold">Status</th>
                      <th className="px-4 py-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-ink-800)]/50">
                    {users.map((u) => (
                      <tr key={u.id} className={cn(
                        "group transition-colors",
                        !u.isActive && "opacity-60 grayscale-[0.5]"
                      )}>
                        <td className="px-4 py-4 font-medium text-[var(--color-bone-100)] flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[var(--color-ink-800)] border border-[var(--color-ink-700)] flex items-center justify-center text-[10px] text-[var(--color-bone-500)] font-mono">
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          {u.username}
                          {u.id === currentUser?.id && (
                            <span className="text-[9px] uppercase tracking-wider bg-[var(--color-pearl-300)]/10 text-[var(--color-pearl-300)] px-1.5 py-0.5 rounded border border-[var(--color-pearl-300)]/20 ml-1">You</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            u.role === "admin" ? "bg-[var(--color-pearl-300)]/10 text-[var(--color-pearl-300)] border border-[var(--color-pearl-300)]/20" : "bg-[var(--color-ink-800)] text-[var(--color-bone-500)] border border-[var(--color-ink-700)]"
                          )}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {u.isActive ? (
                            <span className="flex items-center gap-1.5 text-emerald-500 text-[11px] font-medium">
                              <UserCheck size={12} /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[var(--color-bone-600)] text-[11px] font-medium">
                              <UserX size={12} /> Deactivated
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {u.id !== currentUser?.id && (
                              <>
                                <button
                                  onClick={() => toggleRole(u)}
                                  disabled={busy}
                                  title={u.role === 'admin' ? "Downgrade to Editor" : "Upgrade to Admin"}
                                  className="p-2 text-[var(--color-bone-500)] hover:text-[var(--color-pearl-300)] transition-colors"
                                >
                                  <Shield size={16} />
                                </button>
                                <button
                                  onClick={() => toggleStatus(u)}
                                  disabled={busy}
                                  title={u.isActive ? "Deactivate" : "Activate"}
                                  className="p-2 text-[var(--color-bone-500)] hover:text-[var(--color-bone-100)] transition-colors"
                                >
                                  {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                                </button>
                                <button
                                  onClick={() => handleDelete(u)}
                                  disabled={busy}
                                  title="Delete user"
                                  className="p-2 text-[var(--color-bone-500)] hover:text-[var(--color-wine-500)] transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-[var(--color-bone-600)] italic">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {!showAdd ? (
              <button
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center justify-center gap-3 p-8 border border-dashed border-[var(--color-ink-700)] bg-[var(--color-ink-950)]/20 text-[var(--color-bone-400)] hover:border-[var(--color-pearl-300)] hover:text-[var(--color-bone-100)] transition-all group"
              >
                <div className="p-3 rounded-full bg-[var(--color-ink-800)] border border-[var(--color-ink-700)] group-hover:border-[var(--color-pearl-300)] transition-colors">
                  <UserPlus size={20} />
                </div>
                <span className="label-eyebrow">Create New User</span>
              </button>
            ) : (
              <Card 
                title="Create User" 
                description="Add a new administrator or editor to the studio."
              >
                <div className="grid gap-5">
                  <TextField
                    label="Username"
                    value={newUsername}
                    onChange={setNewUsername}
                    placeholder="e.g. editor_jane"
                  />
                  <TextField
                    label="Initial Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Min 8 characters"
                  />
                  <SelectField
                    label="Access Role"
                    value={newRole}
                    onChange={setNewRole}
                    options={[
                      { value: "editor", label: "Editor — Content only" },
                      { value: "admin", label: "Admin — Full access" },
                    ]}
                    hint="Admins can manage users and system settings. Editors are restricted to content sections."
                  />
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAdd}
                      disabled={busy || !newUsername || newPassword.length < 8}
                      className="flex-1 bg-[var(--color-pearl-300)] text-[var(--color-ink-900)] label-eyebrow py-3 shadow-lg transition-transform hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:scale-100"
                    >
                      {busy ? "Creating…" : "Create User"}
                    </button>
                    <button
                      onClick={() => setShowAdd(false)}
                      className="px-4 py-3 border border-[var(--color-ink-700)] text-[var(--color-bone-500)] label-eyebrow hover:bg-[var(--color-ink-800)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </Card>
            )}

            <Card
              title="RBAC Roles"
              description="How permissions work in the studio."
            >
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Shield size={18} className="mt-0.5 shrink-0 text-[var(--color-pearl-300)]" />
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-bone-200)]">Admin</h5>
                    <p className="mt-1 text-xs text-[var(--color-bone-500)] leading-relaxed">
                      Full control. Can manage other users, view activity logs, and change core studio settings.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Key size={18} className="mt-0.5 shrink-0 text-[var(--color-bone-600)]" />
                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-bone-200)]">Editor</h5>
                    <p className="mt-1 text-xs text-[var(--color-bone-500)] leading-relaxed">
                      Content focus. Can manage wines, copy, and layout, but cannot access user management or system logs.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
