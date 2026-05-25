import { useEffect, useState } from "react";
import { Activity, Search, RefreshCcw } from "lucide-react";
import { PageHeader } from "../../components/admin/PageHeader";
import { Card } from "../../components/admin/Card";
import { fetchAuditLogs, errorMessage } from "../../services/api";
import type { AuditLog } from "../../lib/types";
import { cn } from "../../lib/utils";

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAuditLogs({ limit: 200 });
      setLogs(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.username.toLowerCase().includes(filter.toLowerCase()) ||
      l.action.toLowerCase().includes(filter.toLowerCase()) ||
      l.target_type.toLowerCase().includes(filter.toLowerCase()) ||
      (l.details || "").toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <>
      <PageHeader
        eyebrow="System"
        title="Activity Log"
        description="Audit trail of administrative actions. Records who changed what and when."
      />

      <div className="space-y-6 p-5 lg:p-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-bone-600)]"
            />
            <input
              type="text"
              placeholder="Filter by user, action, or target…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full bg-[var(--color-ink-950)]/40 border border-[var(--color-ink-700)] focus:border-[var(--color-pearl-300)] focus:outline-none text-sm text-[var(--color-bone-100)] pl-10 pr-4 py-2.5 transition-all font-body shadow-inner"
            />
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 label-eyebrow border border-[var(--color-ink-700)] px-4 py-2.5 text-[var(--color-bone-400)] transition-colors hover:bg-[var(--color-ink-800)] disabled:opacity-50"
          >
            <RefreshCcw size={14} className={cn(loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="border border-[var(--color-wine-800)]/30 bg-[var(--color-wine-950)]/20 p-4 text-sm text-[var(--color-wine-400)] italic">
            {error}
          </div>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-ink-700)] text-[10px] uppercase tracking-[0.2em] text-[var(--color-bone-500)]">
                  <th className="px-4 py-4 font-semibold">Time</th>
                  <th className="px-4 py-4 font-semibold">User</th>
                  <th className="px-4 py-4 font-semibold">Action</th>
                  <th className="px-4 py-4 font-semibold">Target</th>
                  <th className="px-4 py-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-ink-800)]/50">
                {filtered.map((log) => (
                  <tr key={log.id} className="group hover:bg-[var(--color-ink-900)]/40 transition-colors">
                    <td className="whitespace-nowrap px-4 py-4 text-[var(--color-bone-500)] font-mono text-[11px]">
                      {log.timestamp.replace("T", " ")}
                    </td>
                    <td className="px-4 py-4 font-medium text-[var(--color-bone-200)]">
                      {log.username}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        log.action === "DELETE" ? "bg-[var(--color-wine-950)] text-[var(--color-wine-400)]" :
                        log.action === "CREATE" ? "bg-emerald-950/40 text-emerald-400" :
                        log.action === "LOGIN" ? "bg-blue-950/40 text-blue-400" :
                        "bg-[var(--color-ink-800)] text-[var(--color-bone-400)]"
                      )}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[var(--color-bone-400)]">
                      <span className="opacity-60">{log.target_type}</span>
                      {log.target_id && <span className="ml-2 text-[var(--color-bone-600)] font-mono text-[11px]">#{log.target_id}</span>}
                    </td>
                    <td className="px-4 py-4 text-[var(--color-bone-300)] italic text-[13px] leading-relaxed">
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[var(--color-bone-600)] italic">
                      No activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Activity size={18} className="text-[var(--color-bone-600)]" />
          <p className="text-xs text-[var(--color-bone-500)] leading-relaxed">
            Logs are preserved indefinitely. Actions like logins, record creation, updates, and deletions are automatically captured.
          </p>
        </div>
      </div>
    </>
  );
}
