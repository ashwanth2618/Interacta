"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeading, FilterBar, IssuesTable, IssueDetailModal, useApi } from "@/components/shared";
import { Spinner } from "@/components/ui";
import { ISSUE_CATEGORIES, PRIORITIES, ISSUE_STATUSES } from "@/lib/constants";

interface StaffRow { id: number; name: string; department: string | null; designation: string | null }

export default function AdminIssuesPage() {
  const [filters, setFilters] = useState<Record<string, string>>({ search: "", category: "", priority: "", status: "" });
  const [debounced, setDebounced] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

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
  const { data: staffData } = useApi<{ staff: StaffRow[] }>("/api/staff");

  const staff = (staffData?.staff ?? []).map((s) => ({ id: s.id, name: s.name, department: s.department, designation: s.designation }));

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Issue Management"
        subtitle="Review, assign to staff, respond and track every issue to closure."
      />

      <FilterBar
        search={filters.search}
        searchPlaceholder="Search by title, description or tracking ID…"
        values={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        filters={[
          { key: "category", label: "categories", options: [...ISSUE_CATEGORIES] },
          { key: "priority", label: "priorities", options: [...PRIORITIES] },
          { key: "status", label: "statuses", options: [...ISSUE_STATUSES] },
        ]}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}
      {data && (
        <IssuesTable
          issues={data.issues}
          onOpen={setDetailId}
          emptyTitle="No issues found"
          emptyBody="Student issues will appear here as they are submitted."
        />
      )}

      <IssueDetailModal
        issueId={detailId}
        role="ADMIN"
        onClose={() => setDetailId(null)}
        onChanged={refetch}
        staffList={staff}
      />
    </div>
  );
}
