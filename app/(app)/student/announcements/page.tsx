"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeading, FilterBar, useApi, timeAgo } from "@/components/shared";
import { Spinner, EmptyState, Modal } from "@/components/ui";
import { StatusBadge } from "@/components/badges";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/constants";

interface Ann {
  id: number; title: string; body: string; category: string; priority: string;
  authorName: string; expiryDate: string | null; createdAt: string;
}

export default function StudentAnnouncementsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", category: "" });
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Ann | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(filters.search), 350); return () => clearTimeout(t); }, [filters.search]);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (debounced) p.set("search", debounced);
    if (filters.category) p.set("category", filters.category);
    return p.toString();
  }, [debounced, filters.category]);

  const { data, loading, error, refetch } = useApi<{ announcements: Ann[] }>(`/api/announcements?${qs}`);

  return (
    <div className="animate-fade-in">
      <PageHeading title="Notice Board" subtitle="Official announcements from the management and departments." />
      <FilterBar
        search={filters.search}
        searchPlaceholder="Search notices…"
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        filters={[{ key: "category", label: "categories", options: [...ANNOUNCEMENT_CATEGORIES] }]}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}

      {data && (data.announcements.length === 0 ? (
        <div className="card"><EmptyState icon="📢" title="No announcements found" body="Check back later for new notices." /></div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
          {data.announcements.map((a) => (
            <button key={a.id} className="card card-hover p-4 sm:p-5 text-left block w-full" onClick={() => setSelected(a)}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <StatusBadge status={a.priority} />
                <span className="badge bg-ink-100 text-ink-600">{a.category}</span>
                <span className="text-xs text-ink-400 ml-auto">{timeAgo(a.createdAt)}</span>
              </div>
              <h3 className="font-bold text-ink-900">{a.title}</h3>
              <p className="text-sm text-ink-500 mt-1 line-clamp-2-fix">{a.body}</p>
              <p className="text-xs text-ink-400 mt-2">By {a.authorName} · Administration</p>
            </button>
          ))}
        </div>
      ))}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.category ?? "Announcement"}>
        {selected && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={selected.priority} />
            </div>
            <h3 className="text-lg font-black text-ink-900">{selected.title}</h3>
            <p className="text-xs text-ink-400 mt-1">By {selected.authorName} · Published {new Date(selected.createdAt).toLocaleString()}</p>
            {selected.expiryDate && <p className="text-xs text-ink-400">Visible until {new Date(selected.expiryDate).toLocaleDateString()}</p>}
            <p className="mt-4 text-sm text-ink-700 whitespace-pre-wrap leading-relaxed">{selected.body}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
