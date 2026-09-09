"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal, Spinner, EmptyState, ErrorState, SkeletonList, useToast } from "./ui";
import { StatusBadge, PriorityBadge, AnonBadge, CategoryChip } from "./badges";

export function timeAgo(iso: string): string {
  const s = Math.max(0, Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* --------------------- Dashboard data hook + heading --------------------- */

export interface DashData { role: string; [k: string]: unknown }

export function PageHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Filter bar ------------------------------ */

export interface FilterSpec { key: string; label: string; options: string[] }

export function FilterBar({ filters, values, onChange, searchPlaceholder, search }: {
  filters: FilterSpec[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  searchPlaceholder?: string;
  search: string;
}) {
  return (
    <div className="flex flex-wrap gap-2.5 mb-5">
      {searchPlaceholder !== undefined && (
        <input
          className="input sm:max-w-xs flex-1"
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onChange("search", e.target.value)}
          aria-label="Search"
        />
      )}
      {filters.map((f) => (
        <select key={f.key} className="input !w-auto min-w-[130px]" value={values[f.key] ?? ""} onChange={(e) => onChange(f.key, e.target.value)} aria-label={f.label}>
          <option value="">All {f.label}</option>
          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ))}
    </div>
  );
}

/* ------------------------- Issue detail modal ------------------------- */

export interface IssueDetail {
  issue: {
    id: number; trackingId: string; title: string; description: string; category: string;
    priority: string; status: string; isAnonymous: boolean; attachmentName: string | null;
    createdAt: string; updatedAt: string; studentName: string; studentCode: string | null;
    assignedStaffId: number | null; staffName: string | null;
  };
  responses: Array<{ id: number; message: string; responderRole: string; responderName: string; createdAt: string }>;
  timeline: Array<{ kind: string; at: string; label: string }>;
}

export function IssueDetailModal({ issueId, role, onClose, onChanged, staffList }: {
  issueId: number | null;
  role: "STUDENT" | "STAFF" | "ADMIN";
  onClose: () => void;
  onChanged?: () => void;
  staffList?: Array<{ id: number; name: string; department: string | null; designation: string | null }>;
}) {
  const [data, setData] = useState<IssueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [sending, setSending] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [staffId, setStaffId] = useState("");
  const toast = useToast();

  const load = async () => {
    if (!issueId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}`);
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "Failed to load issue"); }
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load issue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [issueId]);

  if (!issueId) return null;

  const act = async (payload: Record<string, unknown>, okMsg: string) => {
    setSending(true);
    try {
      const res = await fetch(`/api/issues/${issueId}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Action failed");
      toast("success", okMsg);
      setResponse("");
      await load();
      onChanged?.();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Action failed");
    } finally {
      setSending(false);
    }
  };

  const i = data?.issue;
  const canRespond = (role === "ADMIN") || (role === "STAFF" && i && i.assignedStaffId !== null);

  return (
    <Modal open={!!issueId} onClose={onClose} title={`Issue ${i?.trackingId ?? "…"}`} wide>
      {loading && <div className="py-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {!loading && error && <ErrorState message={error} onRetry={load} />}
      {!loading && !error && i && (
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={i.status} />
              <PriorityBadge priority={i.priority} />
              <CategoryChip>{i.category}</CategoryChip>
              {i.isAnonymous && <AnonBadge />}
            </div>
            <h3 className="text-lg font-bold text-ink-900">{i.title}</h3>
            <p className="text-sm text-ink-500 mt-0.5">
              {i.isAnonymous ? "Anonymous Student" : `${i.studentName}${i.studentCode ? ` · ${i.studentCode}` : ""}`}
              {" · "}{new Date(i.createdAt).toLocaleString()}
            </p>
          </div>

          <p className="text-sm text-ink-700 whitespace-pre-wrap bg-ink-50 rounded-xl p-4 leading-relaxed">{i.description}</p>
          {i.attachmentName && (
            <p className="text-xs text-ink-500 flex items-center gap-1.5">📎 Attachment: <span className="font-semibold">{i.attachmentName}</span> <span className="text-ink-400">(stored reference)</span></p>
          )}

          {/* admin controls */}
          {role === "ADMIN" && (
            <div className="card p-4 space-y-3 bg-brand-50/40 border-brand-100">
              <p className="text-sm font-bold text-ink-900">Admin actions</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select className="input !w-auto" value={staffId} onChange={(e) => setStaffId(e.target.value)} aria-label="Assign staff">
                  <option value="">Assign to staff…</option>
                  {(staffList ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.department ?? "Staff"}{s.designation ? ` (${s.designation})` : ""}</option>
                  ))}
                </select>
                <button className="btn-primary !py-2" disabled={!staffId || assigning || sending}
                  onClick={async () => {
                    setAssigning(true);
                    await act({ action: "assign", staffId: Number(staffId) }, "Issue assigned — staff and student notified");
                    setAssigning(false);
                  }}>Assign</button>
                <span className="text-ink-300">|</span>
                {["UNDER REVIEW", "IN PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                  <button key={s} className="btn-secondary !py-1.5 !px-3 text-xs" disabled={i.status === s || sending}
                    onClick={() => act({ action: "status", status: s }, `Status set to ${s}`)}>{s}</button>
                ))}
              </div>
              {i.staffName && <p className="text-xs text-ink-500">Currently assigned to <span className="font-semibold">{i.staffName}</span></p>}
            </div>
          )}

          {/* staff quick status */}
          {role === "STAFF" && (
            <div className="card p-4 space-y-2 bg-brand-50/40 border-brand-100">
              <p className="text-sm font-bold text-ink-900">Staff actions</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary !py-1.5 !px-3 text-xs" disabled={i.status === "IN PROGRESS" || sending}
                  onClick={() => act({ action: "status", status: "IN PROGRESS" }, "Status set to IN PROGRESS")}>Mark IN PROGRESS</button>
                <button className="btn-primary !py-1.5 !px-3 text-xs" disabled={i.status === "RESOLVED" || sending}
                  onClick={() => act({ action: "status", status: "RESOLVED" }, "Issue marked RESOLVED — student notified")}>Mark RESOLVED</button>
              </div>
            </div>
          )}

          {/* respond */}
          {canRespond && (
            <div>
              <label className="label" htmlFor="issue-response">Response / resolution notes</label>
              <textarea id="issue-response" className="input min-h-[88px]" placeholder="Explain the action taken, next steps, or the resolution…"
                value={response} onChange={(e) => setResponse(e.target.value)} />
              <button className="btn-primary mt-2" disabled={sending || response.trim().length < 5}
                onClick={() => act({ action: "respond", message: response.trim() }, "Response posted — student notified")}>
                {sending ? "Posting…" : "Post response"}
              </button>
            </div>
          )}

          {/* responses */}
          <div>
            <p className="text-sm font-bold text-ink-900 mb-2">Conversation ({data!.responses.length})</p>
            {data!.responses.length === 0 && <p className="text-sm text-ink-400 italic">No responses yet.</p>}
            <div className="space-y-2.5">
              {data!.responses.map((r) => (
                <div key={r.id} className={`rounded-xl p-3.5 text-sm ${r.responderRole === "STUDENT" ? "bg-ink-50" : "bg-brand-50/70 border border-brand-100"}`}>
                  <p className="font-semibold text-ink-800 text-xs mb-1">
                    {r.responderRole === "ADMIN" ? "🏛️ " : r.responderRole === "STAFF" ? "👔 " : "🎓 "}{r.responderName}
                    <span className="text-ink-400 font-normal"> · {timeAgo(r.createdAt)}</span>
                  </p>
                  <p className="text-ink-700 whitespace-pre-wrap leading-relaxed">{r.message}</p>
                </div>
              ))}
            </div>
          </div>

          {/* timeline */}
          <div>
            <p className="text-sm font-bold text-ink-900 mb-2">Timeline</p>
            <ol className="relative border-l-2 border-ink-100 ml-2 space-y-3">
              {data!.timeline.map((t, idx) => (
                <li key={idx} className="ml-4">
                  <span className="absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 ring-4 ring-brand-100" />
                  <p className="text-sm font-semibold text-ink-800">{t.label}</p>
                  <p className="text-xs text-ink-400">{new Date(t.at).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------- Issues table (shared) ------------------------- */

export function IssuesTable({ issues, onOpen, emptyTitle, emptyBody, emptyAction }: {
  issues: Array<{
    id: number; trackingId: string; title: string; category: string; priority: string; status: string;
    studentName: string; isAnonymous: boolean; staffName?: string | null; createdAt: string; responseCount?: number;
  }>;
  onOpen: (id: number) => void;
  emptyTitle: string; emptyBody?: string; emptyAction?: React.ReactNode;
}) {
  if (issues.length === 0) return <EmptyState icon="🎫" title={emptyTitle} body={emptyBody} action={emptyAction} />;
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="bg-ink-50 border-b border-ink-100">
            <tr>
              <th className="th">Tracking ID</th>
              <th className="th">Issue</th>
              <th className="th">Category</th>
              <th className="th">Priority</th>
              <th className="th">Status</th>
              <th className="th">Raised by</th>
              <th className="th">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {issues.map((i) => (
              <tr key={i.id} className="hover:bg-brand-50/40 cursor-pointer transition-colors" onClick={() => onOpen(i.id)}>
                <td className="td font-mono text-xs font-bold text-brand-700">{i.trackingId}</td>
                <td className="td">
                  <p className="font-semibold text-ink-900 max-w-[280px] truncate">{i.title}</p>
                </td>
                <td className="td"><CategoryChip>{i.category}</CategoryChip></td>
                <td className="td"><PriorityBadge priority={i.priority} /></td>
                <td className="td"><StatusBadge status={i.status} /></td>
                <td className="td text-ink-600">
                  {i.isAnonymous ? <span className="italic">Anonymous Student</span> : i.studentName}
                </td>
                <td className="td text-ink-400 text-xs">{timeAgo(i.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------- data fetch hook --------------------------- */

export function useApi<T>(url: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(url)
      .then(async (res) => {
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
        return j;
      })
      .then((j) => { if (alive) { setData(j); setLoading(false); } })
      .catch((e) => { if (alive) { setError(e instanceof Error ? e.message : "Request failed"); setLoading(false); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce, ...deps]);

  return { data, loading, error, refetch: () => setNonce((n) => n + 1) };
}

export function LoadingBlock() {
  return <div className="py-12 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>;
}
export { SkeletonList, EmptyState, ErrorState };
export { Link };
