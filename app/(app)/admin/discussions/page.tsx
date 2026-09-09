"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeading, FilterBar, useApi, timeAgo } from "@/components/shared";
import { useToast, Spinner, EmptyState, Modal } from "@/components/ui";
import { CategoryChip } from "@/components/badges";
import { DISCUSSION_CATEGORIES } from "@/lib/constants";

interface AdminPost {
  id: number; title: string; body: string; category: string; isAnonymous: boolean;
  authorName: string; likes: number[]; commentCount: number; views: number; createdAt: string;
}

export default function AdminDiscussionsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", category: "" });
  const [debounced, setDebounced] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminPost | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(filters.search), 350); return () => clearTimeout(t); }, [filters.search]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (debounced) p.set("search", debounced);
    if (filters.category) p.set("category", filters.category);
    return p.toString();
  }, [debounced, filters]);

  // note: admin sees all VISIBLE posts via public list; moderation actions via API
  const { data, loading, error, refetch } = useApi<{ posts: AdminPost[] }>(`/api/discussions?${qs}`);

  const moderate = async (id: number, op: string) => {
    const res = await fetch(`/api/discussions/${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "moderate", op }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { toast("error", j.error || "Action failed"); return; }
    toast("success", op === "delete" ? "Post deleted" : op === "hide" ? "Post hidden from the board" : "Post restored");
    setConfirmDelete(null);
    refetch();
  };

  return (
    <div className="animate-fade-in">
      <PageHeading title="Discussion Moderation" subtitle="Review posts, hide inappropriate content and keep the community healthy." />

      <FilterBar
        search={filters.search}
        searchPlaceholder="Search posts…"
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        filters={[{ key: "category", label: "categories", options: [...DISCUSSION_CATEGORIES] }]}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}

      {data && (data.posts.length === 0 ? (
        <div className="card"><EmptyState icon="🗣️" title="No discussions found" /></div>
      ) : (
        <div className="space-y-3">
          {data.posts.map((p) => (
            <div key={p.id} className="card p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <CategoryChip>{p.category}</CategoryChip>
                {p.isAnonymous && <span className="badge bg-ink-900 text-white">🕵️ Anonymous</span>}
                <span className="text-xs text-ink-400 ml-auto">{p.authorName} · {timeAgo(p.createdAt)} · 👁 {p.views} · 💬 {p.commentCount} · ❤️ {p.likes.length}</span>
              </div>
              <h3 className="font-bold text-ink-900">{p.title}</h3>
              <p className="text-sm text-ink-600 mt-1 line-clamp-2-fix">{p.body}</p>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ink-100">
                <a className="btn-secondary !py-2 text-xs" href={`/student/discussions/${p.id}`}>View thread</a>
                <button className="btn-secondary !py-2 text-xs" onClick={() => moderate(p.id, "hide")}>Hide</button>
                <button className="btn-danger !py-2 text-xs" onClick={() => setConfirmDelete(p)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete this post?">
        <p className="text-sm text-ink-600">
          “<span className="font-semibold">{confirmDelete?.title}</span>” and all its comments will be permanently removed. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2.5 mt-4">
          <button className="btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button className="btn-danger" onClick={() => confirmDelete && moderate(confirmDelete.id, "delete")}>Delete permanently</button>
        </div>
      </Modal>
    </div>
  );
}
