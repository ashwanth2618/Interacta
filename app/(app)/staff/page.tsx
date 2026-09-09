"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeading, useApi, LoadingBlock, ErrorState, timeAgo, IssueDetailModal } from "@/components/shared";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { EmptyState } from "@/components/ui";

interface StaffDash {
  stats: { assigned: number; pending: number; inProgress: number; resolved: number; unread: number };
  issues: Array<{ id: number; tracking_id: string; title: string; status: string; priority: string; category: string; updated_at: string; student_name: string }>;
  announcements: Array<{ id: number; title: string; category: string; priority: string; created_at: string }>;
}

export default function StaffDashboard() {
  const { data, loading, error, refetch } = useApi<StaffDash>("/api/dashboard");
  const [detailId, setDetailId] = useState<number | null>(null);

  return (
    <div className="animate-fade-in">
      <PageHeading title="Staff Dashboard" subtitle="Issues assigned to you, with the actions students are waiting on." />

      {loading && <LoadingBlock />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Assigned to me", value: data.stats.assigned, icon: "🎫", tint: "bg-brand-50 text-brand-600" },
              { label: "Awaiting response", value: data.stats.pending, icon: "⏳", tint: "bg-amber-50 text-amber-600" },
              { label: "In progress", value: data.stats.inProgress, icon: "🔧", tint: "bg-sky-50 text-sky-600" },
              { label: "Resolved", value: data.stats.resolved, icon: "✅", tint: "bg-emerald-50 text-emerald-600" },
            ].map((s) => (
              <div key={s.label} className="card card-hover p-4 sm:p-5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg mb-3 ${s.tint}`} aria-hidden>{s.icon}</div>
                <p className="text-2xl sm:text-3xl font-black text-ink-900">{s.value}</p>
                <p className="text-xs font-semibold text-ink-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">Priority queue</h2>
              <Link href="/staff/issues" className="text-sm font-semibold text-brand-600 hover:underline">Open all issues</Link>
            </div>
            {data.issues.length === 0 ? (
              <EmptyState icon="🎉" title="No active issues" body="You're all caught up. Newly assigned issues will appear here." />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.issues.map((i) => (
                  <li key={i.id}>
                    <button className="w-full py-3.5 first:pt-1 last:pb-1 flex items-center gap-3 text-left hover:bg-ink-50/60 rounded-lg px-2 -mx-2 transition-colors"
                      onClick={() => setDetailId(i.id)}>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] font-bold text-brand-700">{i.tracking_id} · {i.category}</p>
                        <p className="text-sm font-semibold text-ink-900 truncate">{i.title}</p>
                        <p className="text-xs text-ink-400">{i.student_name} · updated {timeAgo(i.updated_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <PriorityBadge priority={i.priority} />
                        <StatusBadge status={i.status} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="section-title mb-3">Latest announcements</h2>
            {data.announcements.length === 0 ? (
              <EmptyState icon="📢" title="No announcements" />
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.announcements.map((a) => (
                  <li key={a.id} className="py-3 flex items-center gap-3">
                    <StatusBadge status={a.priority} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-800 truncate">{a.title}</p>
                      <p className="text-xs text-ink-400">{a.category} · {timeAgo(a.created_at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <IssueDetailModal issueId={detailId} role="STAFF" onClose={() => setDetailId(null)} onChanged={refetch} />
    </div>
  );
}
