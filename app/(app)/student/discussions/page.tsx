"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeading, FilterBar, useApi, timeAgo } from "@/components/shared";
import { Modal, useToast, Spinner, EmptyState } from "@/components/ui";
import { CategoryChip } from "@/components/badges";
import { DISCUSSION_CATEGORIES } from "@/lib/constants";

interface Post {
  id: number; title: string; body: string; category: string; isAnonymous: boolean;
  authorName: string; authorRole: string; likes: number[]; commentCount: number; views: number; createdAt: string;
}

export default function DiscussionsPage() {
  const toast = useToast();
  const sp = useSearchParams();
  const [showNew, setShowNew] = useState(false);
  const [sort, setSort] = useState("recent");
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", category: "" });
  const [debounced, setDebounced] = useState("");

  useEffect(() => { setShowNew(sp.get("new") === "1"); }, [sp]);
  useEffect(() => { const t = setTimeout(() => setDebounced(filters.search), 350); return () => clearTimeout(t); }, [filters.search]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (debounced) p.set("search", debounced);
    if (filters.category) p.set("category", filters.category);
    p.set("sort", sort);
    return p.toString();
  }, [debounced, filters.category, sort]);

  const { data, loading, error, refetch } = useApi<{ posts: Post[] }>(`/api/discussions?${qs}`);

  const [form, setForm] = useState({ title: "", body: "", category: "", isAnonymous: false });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (form.title.trim().length < 5 || form.body.trim().length < 10 || !form.category) {
      toast("error", "Please fill title (5+ chars), body (10+ chars) and category");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/discussions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, title: form.title.trim(), body: form.body.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to post");
      toast("success", "Discussion posted!");
      setForm({ title: "", body: "", category: "", isAnonymous: false });
      setShowNew(false);
      refetch();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Discussion Board"
        subtitle="Ask questions, share knowledge, and join campus conversations."
        action={<button className="btn-primary" onClick={() => setShowNew(true)}>+ New post</button>}
      />

      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <input className="input sm:max-w-xs flex-1" placeholder="Search discussions…" value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} aria-label="Search discussions" />
        <select className="input !w-auto min-w-[130px]" value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} aria-label="Category">
          <option value="">All categories</option>
          {DISCUSSION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <div className="flex rounded-xl border border-ink-200 bg-white p-1">
          {["recent", "trending"].map((s) => (
            <button key={s} className={`tab !py-1.5 ${sort === s ? "tab-active" : ""}`} onClick={() => setSort(s)}>
              {s === "recent" ? "🕐 Recent" : "🔥 Trending"}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}

      {data && (data.posts.length === 0 ? (
        <div className="card"><EmptyState icon="🗣️" title="No discussions found" body="Start the conversation — ask a question or share something useful." action={<button className="btn-primary" onClick={() => setShowNew(true)}>Create the first post</button>} /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          {data.posts.map((p) => (
            <Link key={p.id} href={`/student/discussions/${p.id}`} className="card card-hover p-4 sm:p-5 block">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <CategoryChip>{p.category}</CategoryChip>
                {p.isAnonymous && <span className="badge bg-ink-900 text-white">🕵️ Anonymous</span>}
              </div>
              <h3 className="font-bold text-ink-900 group-hover:text-brand-700">{p.title}</h3>
              <p className="text-sm text-ink-500 mt-1 line-clamp-2-fix">{p.body}</p>
              <div className="flex items-center gap-3 mt-3 text-xs text-ink-400">
                <span className="font-semibold text-ink-600">{p.authorName}</span>
                <span>· {timeAgo(p.createdAt)}</span>
                <span className="ml-auto flex items-center gap-1">❤️ {p.likes.length}</span>
                <span>💬 {p.commentCount}</span>
                <span>👁 {p.views}</span>
              </div>
            </Link>
          ))}
        </div>
      ))}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create a discussion post" wide>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div>
            <label className="label" htmlFor="d-title">Title *</label>
            <input id="d-title" className="input" placeholder="e.g., How to prepare for OOPs interview questions?"
              value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="d-cat">Category *</label>
            <select id="d-cat" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select category…</option>
              {DISCUSSION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="d-body">Details *</label>
            <textarea id="d-body" className="input min-h-[110px]" placeholder="Describe your question or topic…"
              value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-brand-600" checked={form.isAnonymous} onChange={(e) => setForm({ ...form, isAnonymous: e.target.checked })} />
            Post anonymously
          </label>
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? <><Spinner className="w-4 h-4" /> Posting…</> : "Post discussion"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
