"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeading, FilterBar, IssuesTable, IssueDetailModal, useApi } from "@/components/shared";
import { Spinner } from "@/components/ui";

export default function StaffIssuesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", category: "", priority: "", status: "" });
  const [detailId, setDetailId] = useState<number | null>(null);
  const [debounced, setDebounced] = useState("");

  useEffect(() => { const t = setTimeout(() => setDebounced(filters.search), 350); return () => clearTimeout(t); }, [filters.search]);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (debounced) p.set("search", debounced);
    if (filters.category) p.set("category", filters.category);
    if (filters.priority) p.set("priority", filters.priority);
    if (filters.status) p.set("status", filters.status);
    return p.toString();
  }, [debounced, filters]);

  const { data, loading, error, refetch } = useApi<{ issues: Parameters<typeof IssuesTable>[0]["issues"] }>(`/api/issues?${query}`);

  return (
    <div className="animate-fade-in">
      <PageHeading title="Assigned Issues" subtitle="Open an issue to read details, respond, add resolution notes and update status." />

      <FilterBar
        search={filters.search}
        searchPlaceholder="Search assigned issues…"
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        filters={[
          { key: "category", label: "categories", options: ["Academics", "Infrastructure", "Hostel", "Transport", "Canteen", "Placement", "Faculty", "Examination", "Administration", "Other"] },
          { key: "priority", label: "priorities", options: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
          { key: "status", label: "statuses", options: ["SUBMITTED", "UNDER REVIEW", "ASSIGNED", "IN PROGRESS", "RESOLVED", "CLOSED"] },
        ]}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}
      {data && (
        <IssuesTable
          issues={data.issues}
          onOpen={setDetailId}
          emptyTitle="No assigned issues"
          emptyBody="Issues assigned to you by the admin will appear here."
        />
      )}

      <IssueDetailModal issueId={detailId} role="STAFF" onClose={() => setDetailId(null)} onChanged={refetch} />
    </div>
  );
}
