"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeading, FilterBar, useApi, timeAgo } from "@/components/shared";
import { Modal, useToast, Spinner, EmptyState } from "@/components/ui";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { FEEDBACK_CATEGORIES, FEEDBACK_TYPES, PRIORITIES, FEEDBACK_STATUSES } from "@/lib/constants";

interface FeedbackItem {
  id: number; type: string; category: string; title: string; description: string;
  priority: string; status: string; adminResponse: string | null; isAnonymous: boolean;
  studentName: string; createdAt: string;
}

const TYPE_HELP: Record<string, string> = {
  FEEDBACK: "General feedback about classes, facilities or services",
  SUGGESTION: "An idea that could improve campus life",
  COMPLAINT: "Something that is not working as it should",
  CONCERN: "A worry you'd like management to know about",
};

export default function StudentFeedbackPage() {
  const toast = useToast();
  const sp = useSearchParams();
  const [showNew, setShowNew] = useState(false);
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", status: "", type: "" });
  const [debounced, setDebounced] = useState("");

  useEffect(() => { setShowNew(sp.get("new") === "1"); }, [sp]);
  useEffect(() => { const t = setTimeout(() => setDebounced(filters.search), 350); return () => clearTimeout(t); }, [filters.search]);

  const qs = new URLSearchParams();
  if (debounced) qs.set("search", debounced);
  if (filters.status) qs.set("status", filters.status);
  if (filters.type) qs.set("type", filters.type);

  const { data, loading, error, refetch } = useApi<{ feedback: FeedbackItem[] }>(`/api/feedback?${qs}`);

  const [form, setForm] = useState({ type: "FEEDBACK", category: "", title: "", description: "", priority: "MEDIUM", isAnonymous: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 5) e.title = "Title must be at least 5 characters";
    if (form.description.trim().length < 20) e.description = "Please write at least 20 characters";
    if (!form.category) e.category = "Choose a category";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), description: form.description.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to submit");
      toast("success", "Submitted — the admin office has been notified.");
      setForm({ type: "FEEDBACK", category: "", title: "", description: "", priority: "MEDIUM", isAnonymous: false });
      setShowNew(false);
      refetch();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Feedback & Suggestions"
        subtitle="Help improve campus — every submission reaches the management directly."
        action={<button className="btn-primary" onClick={() => setShowNew(true)}>+ Submit feedback</button>}
      />

      <FilterBar
        search={filters.search}
        searchPlaceholder="Search your submissions…"
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        filters={[
          { key: "type", label: "types", options: [...FEEDBACK_TYPES] },
          { key: "status", label: "statuses", options: [...FEEDBACK_STATUSES] },
        ]}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}

      {data && (data.feedback.length === 0 ? (
        <div className="card"><EmptyState icon="💬" title="No submissions yet" body="Share your first feedback, suggestion, complaint or concern." action={<button className="btn-primary" onClick={() => setShowNew(true)}>Submit feedback</button>} /></div>
      ) : (
        <div className="space-y-3">
          {data.feedback.map((f) => (
            <div key={f.id} className="card card-hover p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={f.type} />
                <StatusBadge status={f.status} />
                <PriorityBadge priority={f.priority} />
                <span className="badge bg-ink-100 text-ink-600">{f.category}</span>
                {f.isAnonymous && <span className="badge bg-ink-900 text-white">🕵️ Anonymous</span>}
                <span className="text-xs text-ink-400 ml-auto">{timeAgo(f.createdAt)}</span>
              </div>
              <h3 className="font-bold text-ink-900">{f.title}</h3>
              <p className="text-sm text-ink-600 mt-1 whitespace-pre-wrap">{f.description}</p>
              {f.adminResponse && (
                <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3.5">
                  <p className="text-xs font-bold text-emerald-700 mb-1">🏛️ Admin response</p>
                  <p className="text-sm text-ink-700 whitespace-pre-wrap">{f.adminResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Submit feedback" wide>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="grid grid-cols-2 gap-2.5">
            {FEEDBACK_TYPES.map((t) => (
              <button type="button" key={t}
                className={`rounded-xl border p-3 text-left transition-all ${form.type === t ? "border-brand-500 bg-brand-50/70 ring-2 ring-brand-500/20" : "border-ink-200 hover:border-ink-300"}`}
                onClick={() => setForm({ ...form, type: t })} aria-pressed={form.type === t}>
                <span className="block text-sm font-bold text-ink-900">{t.charAt(0) + t.slice(1).toLowerCase()}</span>
                <span className="block text-[11px] text-ink-500 mt-0.5 leading-snug">{TYPE_HELP[t]}</span>
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="fb-cat">Category *</label>
              <select id="fb-cat" className={`input ${errors.category ? "input-error" : ""}`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category…</option>
                {FEEDBACK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              {errors.category && <p className="mt-1 text-xs font-medium text-rose-600">{errors.category}</p>}
            </div>
            <div>
              <label className="label" htmlFor="fb-pri">Priority</label>
              <select id="fb-pri" className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="fb-title">Title *</label>
            <input id="fb-title" className={`input ${errors.title ? "input-error" : ""}`} placeholder="Summarize in one line"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            {errors.title && <p className="mt-1 text-xs font-medium text-rose-600">{errors.title}</p>}
          </div>
          <div>
            <label className="label" htmlFor="fb-desc">Description *</label>
            <textarea id="fb-desc" className={`input min-h-[110px] ${errors.description ? "input-error" : ""}`}
              placeholder="Add details so management can act effectively…"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            {errors.description && <p className="mt-1 text-xs font-medium text-rose-600">{errors.description}</p>}
          </div>
          <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={form.isAnonymous}
                onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
              <span>
                <span className="block text-sm font-bold text-ink-900">🕵️ Submit anonymously</span>
                <span className="block text-xs text-ink-500 mt-1">Your identity will not be shown with this submission anywhere on the platform.</span>
              </span>
            </label>
          </div>
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <><Spinner className="w-4 h-4" /> Submitting…</> : "Submit"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
