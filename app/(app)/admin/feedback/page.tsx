"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeading, FilterBar, useApi, timeAgo } from "@/components/shared";
import { Modal, useToast, Spinner, EmptyState } from "@/components/ui";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, FEEDBACK_TYPES } from "@/lib/constants";

interface FbItem {
  id: number; type: string; category: string; title: string; description: string;
  priority: string; status: string; adminResponse: string | null; isAnonymous: boolean;
  studentName: string; createdAt: string;
}

export default function AdminFeedbackPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", category: "", status: "", type: "" });
  const [debounced, setDebounced] = useState("");
  const [responding, setResponding] = useState<FbItem | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(filters.search), 350); return () => clearTimeout(t); }, [filters.search]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (debounced) p.set("search", debounced);
    if (filters.category) p.set("category", filters.category);
    if (filters.status) p.set("status", filters.status);
    if (filters.type) p.set("type", filters.type);
    return p.toString();
  }, [debounced, filters]);

  const { data, loading, error, refetch } = useApi<{ feedback: FbItem[] }>(`/api/feedback?${qs}`);

  const respond = async (markResolved: boolean) => {
    if (!responding) return;
    if (message.trim().length < 5) { toast("error", "Response must be at least 5 characters"); return; }
    setSending(true);
    try {
      const res = await fetch(`/api/feedback/${responding.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "respond", message: message.trim(), markResolved }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      toast("success", markResolved ? "Response sent — feedback marked RESOLVED" : "Response sent — student notified");
      setResponding(null);
      setMessage("");
      refetch();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSending(false);
    }
  };

  const setStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/feedback/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", status }),
    });
    if (res.ok) { toast("success", `Status set to ${status}`); refetch(); }
    else toast("error", "Failed to update status");
  };

  return (
    <div className="animate-fade-in">
      <PageHeading title="Feedback & Suggestions" subtitle="What students are telling management — respond to close the loop." />

      <FilterBar
        search={filters.search}
        searchPlaceholder="Search feedback…"
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        filters={[
          { key: "type", label: "types", options: [...FEEDBACK_TYPES] },
          { key: "category", label: "categories", options: [...FEEDBACK_CATEGORIES] },
          { key: "status", label: "statuses", options: [...FEEDBACK_STATUSES] },
        ]}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}

      {data && (data.feedback.length === 0 ? (
        <div className="card"><EmptyState icon="💬" title="No feedback found" body="Student submissions will appear here." /></div>
      ) : (
        <div className="space-y-3">
          {data.feedback.map((f) => (
            <div key={f.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={f.type} />
                <StatusBadge status={f.status} />
                <PriorityBadge priority={f.priority} />
                <span className="badge bg-ink-100 text-ink-600">{f.category}</span>
                {f.isAnonymous && <span className="badge bg-ink-900 text-white">🕵️ Anonymous</span>}
                <span className="text-xs text-ink-400 ml-auto">
                  {f.isAnonymous ? "Identity protected" : f.studentName} · {timeAgo(f.createdAt)}
                </span>
              </div>
              <h3 className="font-bold text-ink-900">{f.title}</h3>
              <p className="text-sm text-ink-600 mt-1 whitespace-pre-wrap">{f.description}</p>
              {f.adminResponse && (
                <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
                  <p className="text-xs font-bold text-emerald-700 mb-1">🏛️ Your response</p>
                  <p className="text-sm text-ink-700 whitespace-pre-wrap">{f.adminResponse}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-ink-100">
                <button className="btn-primary !py-2 text-xs" onClick={() => { setResponding(f); setMessage(f.adminResponse ?? ""); }}>
                  {f.adminResponse ? "Update response" : "Respond"}
                </button>
                {f.status !== "RESOLVED" && <button className="btn-secondary !py-2 text-xs" onClick={() => setStatus(f.id, "RESOLVED")}>Mark resolved</button>}
                {f.status !== "UNDER REVIEW" && <button className="btn-secondary !py-2 text-xs" onClick={() => setStatus(f.id, "UNDER REVIEW")}>Under review</button>}
                {f.status !== "CLOSED" && <button className="btn-ghost !py-2 text-xs" onClick={() => setStatus(f.id, "CLOSED")}>Close</button>}
              </div>
            </div>
          ))}
        </div>
      ))}

      <Modal open={!!responding} onClose={() => setResponding(null)} title="Respond to feedback">
        {responding && (
          <div>
            <div className="rounded-xl bg-ink-50 p-3.5 mb-4">
              <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">{responding.type}</p>
              <p className="font-bold text-ink-900 mt-0.5">{responding.title}</p>
              <p className="text-sm text-ink-600 mt-1">{responding.description}</p>
            </div>
            <label className="label" htmlFor="fb-resp">Your response (sent to {responding.isAnonymous ? "the anonymous student" : responding.studentName})</label>
            <textarea id="fb-resp" className="input min-h-[110px]" value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Acknowledge the input and describe the action being taken…" />
            <div className="flex justify-end gap-2.5 mt-4">
              <button className="btn-secondary" disabled={sending} onClick={() => respond(false)}>Send (keep open)</button>
              <button className="btn-primary" disabled={sending} onClick={() => respond(true)}>
                {sending ? <Spinner className="w-4 h-4" /> : "Send & mark resolved"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
