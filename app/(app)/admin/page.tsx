"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeading, useApi, LoadingBlock, ErrorState, timeAgo, IssueDetailModal } from "@/components/shared";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { BarChartCard, DonutChart, AreaTrend } from "@/components/charts";
import { EmptyState } from "@/components/ui";

interface AdminDash {
  kpis: {
    totalStudents: number; totalStaff: number; activeIssues: number; resolvedIssues: number;
    feedbackCount: number; discussionsCount: number; announcementsCount: number;
    anonymousShare: number; resolutionRate: number; avgResolutionHours: number | null;
  };
  issuesByCategory: Array<{ name: string; value: number }>;
  issuesByStatus: Array<{ name: string; value: number }>;
  activityByDay: Array<{ day: string; issues: number; feedback: number; discussions: number }>;
  insights: Array<{ id: string; tone: string; title: string; detail: string; actions: string[] }>;
  newIssues: number; openFeedback: number; unread: number;
  recentIssues: Array<{ id: number; tracking_id: string; title: string; status: string; priority: string; category: string; created_at: string; student_name: string }>;
  trending: Array<{ id: number; title: string; views: number; category: string; comment_count: number }>;
}

const TONE: Record<string, string> = {
  positive: "border-l-emerald-500 bg-emerald-50/50",
  warning: "border-l-amber-500 bg-amber-50/50",
  info: "border-l-sky-500 bg-sky-50/50",
};

export default function AdminDashboard() {
  const { data, loading, error, refetch } = useApi<AdminDash>("/api/dashboard");
  const [detailId, setDetailId] = useState<number | null>(null);

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Admin Dashboard"
        subtitle="The pulse of student voice across campus — aggregated and anonymized."
        action={<Link href="/admin/insights" className="btn-primary">🤖 Open AI Insights</Link>}
      />

      {loading && <LoadingBlock />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            {[
              { label: "Students", value: data.kpis.totalStudents, icon: "🎓", href: "/admin/students" },
              { label: "Staff", value: data.kpis.totalStaff, icon: "👔", href: "/admin/staff" },
              { label: "Active issues", value: data.kpis.activeIssues, icon: "🎫", href: "/admin/issues" },
              { label: "Resolved", value: data.kpis.resolvedIssues, icon: "✅", href: "/admin/issues" },
              { label: "Feedback", value: data.kpis.feedbackCount, icon: "💬", href: "/admin/feedback" },
              { label: "Discussions", value: data.kpis.discussionsCount, icon: "🗣️", href: "/admin/discussions" },
              { label: "Announcements", value: data.kpis.announcementsCount, icon: "📢", href: "/admin/announcements" },
            ].map((k) => (
              <Link key={k.label} href={k.href} className="card card-hover p-3.5 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg" aria-hidden>{k.icon}</span>
                  <span className="text-xl sm:text-2xl font-black text-ink-900">{k.value}</span>
                </div>
                <p className="text-[11px] sm:text-xs font-semibold text-ink-500 mt-1.5">{k.label}</p>
              </Link>
            ))}
          </div>

          {/* alert strip */}
          {(data.newIssues > 0 || data.openFeedback > 0) && (
            <div className="card p-4 bg-amber-50/60 border-amber-200 flex flex-wrap items-center gap-3">
              <span className="text-lg" aria-hidden>⚡</span>
              <p className="text-sm font-medium text-ink-800 flex-1">
                {data.newIssues} new issue{data.newIssues !== 1 ? "s" : ""} awaiting review · {data.openFeedback} feedback item{data.openFeedback !== 1 ? "s" : ""} to respond
              </p>
              <Link href="/admin/issues" className="btn-primary !py-2">Review issues</Link>
            </div>
          )}

          {/* charts row */}
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card p-5">
              <h2 className="section-title mb-1">Issues by category</h2>
              <p className="text-xs text-ink-400 mb-3">Where student concerns concentrate</p>
              <BarChartCard data={data.issuesByCategory} xKey="name" bars={[{ key: "value", color: "#4f46e5", name: "Issues" }]} />
            </section>
            <section className="card p-5">
              <h2 className="section-title mb-1">Issues by status</h2>
              <p className="text-xs text-ink-400 mb-3">Pipeline health across the workflow</p>
              <DonutChart data={data.issuesByStatus} />
            </section>
          </div>

          <section className="card p-5">
            <h2 className="section-title mb-1">Engagement trend (14 days)</h2>
            <p className="text-xs text-ink-400 mb-3">Issues, feedback and discussions per day</p>
            <AreaTrend
              data={data.activityByDay}
              series={[
                { key: "issues", color: "#4f46e5", name: "Issues" },
                { key: "feedback", color: "#0ea5e9", name: "Feedback" },
                { key: "discussions", color: "#10b981", name: "Discussions" },
              ]}
            />
          </section>

          {/* insights preview */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="section-title">AI insights preview</h2>
              <Link href="/admin/insights" className="text-sm font-semibold text-brand-600 hover:underline">See all insights</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {data.insights.map((ins) => (
                <div key={ins.id} className={`card p-4 border-l-4 ${TONE[ins.tone] ?? TONE.info}`}>
                  <p className="text-sm font-bold text-ink-900">{ins.title}</p>
                  <p className="text-xs text-ink-500 mt-1.5 leading-relaxed line-clamp-2-fix">{ins.detail}</p>
                </div>
              ))}
              {data.insights.length === 0 && <div className="card p-4 text-sm text-ink-400 md:col-span-3">No insights yet.</div>}
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* recent issues */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Latest issues</h2>
                <Link href="/admin/issues" className="text-sm font-semibold text-brand-600 hover:underline">Manage all</Link>
              </div>
              {data.recentIssues.length === 0 ? <EmptyState icon="🎫" title="No issues yet" /> : (
                <ul className="divide-y divide-ink-100">
                  {data.recentIssues.map((i) => (
                    <li key={i.id}>
                      <button className="w-full py-3 flex items-center gap-3 text-left hover:bg-ink-50/60 rounded-lg px-2 -mx-2 transition-colors" onClick={() => setDetailId(i.id)}>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] font-bold text-brand-700">{i.tracking_id} · {i.category}</p>
                          <p className="text-sm font-semibold text-ink-900 truncate">{i.title}</p>
                          <p className="text-xs text-ink-400">{i.student_name} · {timeAgo(i.created_at)}</p>
                        </div>
                        <div className="flex gap-2 shrink-0"><PriorityBadge priority={i.priority} /><StatusBadge status={i.status} /></div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* trending discussions */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Trending discussions</h2>
                <Link href="/admin/discussions" className="text-sm font-semibold text-brand-600 hover:underline">Moderate</Link>
              </div>
              {data.trending.length === 0 ? <EmptyState icon="🗣️" title="No discussions yet" /> : (
                <ul className="divide-y divide-ink-100">
                  {data.trending.map((d) => (
                    <li key={d.id} className="py-3">
                      <p className="text-sm font-semibold text-ink-800 truncate">{d.title}</p>
                      <p className="text-xs text-ink-400">{d.category} · 👁 {d.views} · 💬 {d.comment_count}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      <IssueDetailModal issueId={detailId} role="ADMIN" onClose={() => setDetailId(null)} onChanged={refetch} />
    </div>
  );
}
