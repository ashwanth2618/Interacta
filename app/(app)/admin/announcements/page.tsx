"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeading, FilterBar, useApi, timeAgo } from "@/components/shared";
import { Modal, useToast, Spinner, EmptyState } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import { ANNOUNCEMENT_CATEGORIES, PRIORITIES } from "@/lib/constants";

interface Ann {
  id: number; title: string; body: string; category: string; priority: string; status: string;
  authorName: string; expiryDate: string | null; attachmentName: string | null; createdAt: string;
}

const EMPTY = { title: "", body: "", category: "", priority: "MEDIUM", expiryDate: "", attachmentName: "" };

export default function AdminAnnouncementsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", category: "" });
  const [debounced, setDebounced] = useState("");
  const [editing, setEditing] = useState<Ann | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Ann | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(filters.search), 350); return () => clearTimeout(t); }, [filters.search]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (debounced) p.set("search", debounced);
    if (filters.category) p.set("category", filters.category);
    p.set("all", "1");
    return p.toString();
  }, [debounced, filters]);

  const { data, loading, error, refetch } = useApi<{ announcements: Ann[] }>(`/api/announcements?${qs}`);

  const openCreate = () => { setForm(EMPTY); setCreating(true); };
  const openEdit = (a: Ann) => {
    setForm({
      title: a.title, body: a.body, category: a.category, priority: a.priority,
      expiryDate: a.expiryDate ? a.expiryDate.slice(0, 10) : "", attachmentName: a.attachmentName ?? "",
    });
    setEditing(a);
  };

  const save = async () => {
    if (form.title.trim().length < 5 || form.body.trim().length < 20 || !form.category) {
      toast("error", "Title (5+), body (20+) and category are required");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/announcements/${editing.id}` : "/api/announcements";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          title: form.title.trim(), body: form.body.trim(),
          expiryDate: form.expiryDate || null,
          attachmentName: form.attachmentName || null,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save");
      toast("success", editing ? "Announcement updated" : "Announcement published — campus notified");
      setCreating(false); setEditing(null);
      refetch();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/announcements/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", status }),
    });
    if (res.ok) { toast("success", `Status: ${status}`); refetch(); } else toast("error", "Failed");
  };

  const del = async () => {
    if (!confirmDelete) return;
    const res = await fetch(`/api/announcements/${confirmDelete.id}`, { method: "DELETE" });
    if (res.ok) { toast("success", "Announcement deleted"); setConfirmDelete(null); refetch(); } else toast("error", "Failed to delete");
  };

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Digital Notice Board"
        subtitle="Publish official announcements — every student and staff member is notified instantly."
        action={<button className="btn-primary" onClick={openCreate}>+ New announcement</button>}
      />

      <FilterBar
        search={filters.search}
        searchPlaceholder="Search announcements…"
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        filters={[{ key: "category", label: "categories", options: [...ANNOUNCEMENT_CATEGORIES] }]}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}

      {data && (data.announcements.length === 0 ? (
        <div className="card"><EmptyState icon="📢" title="No announcements" body="Publish your first notice to reach every student." action={<button className="btn-primary" onClick={openCreate}>Create announcement</button>} /></div>
      ) : (
        <div className="space-y-3">
          {data.announcements.map((a) => (
            <div key={a.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={a.status} />
                <StatusBadge status={a.priority} />
                <span className="badge bg-ink-100 text-ink-600">{a.category}</span>
                <span className="text-xs text-ink-400 ml-auto">{a.authorName} · {timeAgo(a.createdAt)}</span>
              </div>
              <h3 className="font-bold text-ink-900">{a.title}</h3>
              <p className="text-sm text-ink-600 mt-1 line-clamp-2-fix">{a.body}</p>
              {a.expiryDate && <p className="text-xs text-ink-400 mt-1.5">Expires {new Date(a.expiryDate).toLocaleDateString()}</p>}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ink-100">
                <button className="btn-secondary !py-2 text-xs" onClick={() => openEdit(a)}>Edit</button>
                {a.status === "PUBLISHED"
                  ? <button className="btn-secondary !py-2 text-xs" onClick={() => setStatus(a.id, "ARCHIVED")}>Archive</button>
                  : <button className="btn-primary !py-2 text-xs" onClick={() => setStatus(a.id, "PUBLISHED")}>Publish</button>}
                <button className="btn-danger !py-2 text-xs" onClick={() => setConfirmDelete(a)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? "Edit announcement" : "New announcement"} wide>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div>
            <label className="label" htmlFor="an-title">Title *</label>
            <input id="an-title" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., End-semester examination timetable published" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label" htmlFor="an-cat">Category *</label>
              <select id="an-cat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">Select…</option>
                {ANNOUNCEMENT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="an-pri">Priority</label>
              <select id="an-pri" className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="an-exp">Expiry date</label>
              <input id="an-exp" type="date" className="input" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="an-body">Announcement body *</label>
            <textarea id="an-body" className="input min-h-[130px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Full details of the notice: dates, instructions, contacts…" />
          </div>
          <div>
            <label className="label" htmlFor="an-att">Attachment reference (optional)</label>
            <input id="an-att" className="input" value={form.attachmentName} onChange={(e) => setForm({ ...form, attachmentName: e.target.value })}
              placeholder="e.g., timetable.pdf" />
          </div>
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn-secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <><Spinner className="w-4 h-4" /> Saving…</> : editing ? "Save changes" : "📢 Publish"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete announcement?">
        <p className="text-sm text-ink-600">“<span className="font-semibold">{confirmDelete?.title}</span>” will be permanently removed.</p>
        <div className="flex justify-end gap-2.5 mt-4">
          <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={del}>Delete</button>
        </div>
      </Modal>
    </div>
  );
}
