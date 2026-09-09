"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeading, FilterBar, IssuesTable, IssueDetailModal, useApi } from "@/components/shared";
import { Modal, useToast, Spinner } from "@/components/ui";
import { ISSUE_CATEGORIES, PRIORITIES } from "@/lib/constants";

export default function StudentIssuesPage() {
  const toast = useToast();
  const sp = useSearchParams();
  const [showNew, setShowNew] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", category: "", priority: "", status: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => { setShowNew(sp.get("new") === "1"); }, [sp]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedSearch) p.set("search", debouncedSearch);
    if (filters.category) p.set("category", filters.category);
    if (filters.priority) p.set("priority", filters.priority);
    if (filters.status) p.set("status", filters.status);
    return p.toString();
  }, [debouncedSearch, filters.category, filters.priority, filters.status]);

  const { data, loading, error, refetch } = useApi<{ issues: Parameters<typeof IssuesTable>[0]["issues"] }>(
    `/api/issues?${query}`
  );

  // form state
  const [form, setForm] = useState({ title: "", description: "", category: "", priority: "MEDIUM", isAnonymous: false, attachmentName: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [createdTrackingId, setCreatedTrackingId] = useState<string | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.title.trim().length < 5) e.title = "Title must be at least 5 characters";
    if (form.title.trim().length > 120) e.title = "Title must be under 120 characters";
    if (form.description.trim().length < 20) e.description = "Please describe the issue in at least 20 characters";
    if (!form.category) e.category = "Choose a category";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/issues", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), description: form.description.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to submit issue");
      setCreatedTrackingId(j.trackingId);
      toast("success", `Issue submitted — tracking ID ${j.trackingId}`);
      refetch();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ title: "", description: "", category: "", priority: "MEDIUM", isAnonymous: false, attachmentName: "" });
    setErrors({});
    setCreatedTrackingId(null);
    setShowNew(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="My Issues"
        subtitle="Report problems and track them until resolution."
        action={<button className="btn-primary" onClick={() => setShowNew(true)}>+ Raise an issue</button>}
      />
      <FilterBar
        search={filters.search}
        searchPlaceholder="Search by title, description or tracking ID…"
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        filters={[
          { key: "category", label: "categories", options: [...ISSUE_CATEGORIES] },
          { key: "priority", label: "priorities", options: [...PRIORITIES] },
          { key: "status", label: "statuses", options: ["SUBMITTED", "UNDER REVIEW", "ASSIGNED", "IN PROGRESS", "RESOLVED", "CLOSED"] },
        ]}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card"><div className="py-10 text-center text-sm text-rose-600">{error} <button className="font-semibold underline" onClick={refetch}>Retry</button></div></div>}
      {data && <IssuesTable issues={data.issues} onOpen={setDetailId} emptyTitle="No issues found" emptyBody="Raise an issue and track its resolution here — anonymously if you prefer." emptyAction={<button className="btn-primary" onClick={() => setShowNew(true)}>Raise your first issue</button>} />}

      {/* create modal */}
      <Modal open={showNew} onClose={resetForm} title="Raise an issue" wide>
        {createdTrackingId ? (
          <div className="text-center py-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl mb-4" aria-hidden>✅</div>
            <h3 className="text-xl font-black text-ink-900">Issue submitted!</h3>
            <p className="text-sm text-ink-500 mt-1">Your unique tracking ID — keep it handy:</p>
            <p className="my-4 inline-block rounded-2xl bg-brand-50 px-6 py-3 font-mono text-2xl font-black text-brand-700 ring-1 ring-brand-200">{createdTrackingId}</p>
            <p className="text-xs text-ink-500 max-w-sm mx-auto">
              The admin office has been notified. You&apos;ll receive a notification at every status change.
              {form.isAnonymous ? " Your identity stays protected — the report shows as Anonymous Student." : ""}
            </p>
            <div className="mt-5 flex justify-center gap-2.5">
              <button className="btn-primary" onClick={resetForm}>Done</button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div>
              <label className="label" htmlFor="issue-title">Title *</label>
              <input id="issue-title" className={`input ${errors.title ? "input-error" : ""}`} placeholder="e.g., Projectors in CS Block 3 not working"
                value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {errors.title && <p className="mt-1 text-xs font-medium text-rose-600">{errors.title}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="issue-category">Category *</label>
                <select id="issue-category" className={`input ${errors.category ? "input-error" : ""}`} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Select category…</option>
                  {ISSUE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                {errors.category && <p className="mt-1 text-xs font-medium text-rose-600">{errors.category}</p>}
              </div>
              <div>
                <label className="label" htmlFor="issue-priority">Priority *</label>
                <select id="issue-priority" className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="issue-desc">Description *</label>
              <textarea id="issue-desc" className={`input min-h-[120px] ${errors.description ? "input-error" : ""}`}
                placeholder="Describe the issue in detail: what happened, where, since when, and how it affects you…"
                value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="flex justify-between mt-1">
                {errors.description ? <p className="text-xs font-medium text-rose-600">{errors.description}</p> : <span />}
                <p className="text-xs text-ink-400">{form.description.trim().length}/20 min</p>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="issue-attachment">Attachment (optional)</label>
              <input id="issue-attachment" className="input" placeholder="e.g., photo of broken projector.jpg"
                value={form.attachmentName} onChange={(e) => setForm({ ...form, attachmentName: e.target.value })} />
              <p className="mt-1 text-xs text-ink-400">Demo build: stores the file name as a reference with the issue record.</p>
            </div>

            <div className={`rounded-xl border p-4 ${form.isAnonymous ? "border-brand-300 bg-brand-50/70" : "border-ink-200 bg-ink-50"}`}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={form.isAnonymous}
                  onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
                <span>
                  <span className="block text-sm font-bold text-ink-900">🕵️ Submit anonymously</span>
                  <span className="block text-xs text-ink-500 mt-1 leading-relaxed">
                    Your name, ID and email will <strong>never</strong> be shown to other students or staff. The report will
                    display as <strong>&ldquo;Anonymous Student&rdquo;</strong>. Administrators can act on the issue but your identity
                    stays protected in analytics. You can still track this issue from My Issues.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? <><Spinner className="w-4 h-4" /> Submitting…</> : "Submit issue"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <IssueDetailModal issueId={detailId} role="STUDENT" onClose={() => setDetailId(null)} onChanged={refetch} />
    </div>
  );
}
