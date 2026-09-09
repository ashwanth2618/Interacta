"use client";

import { PageHeading, useApi, LoadingBlock, ErrorState } from "@/components/shared";
import { BarChartCard, DonutChart, AreaTrend } from "@/components/charts";

interface InsightsData {
  kpis: {
    totalStudents: number; totalStaff: number; activeIssues: number; resolvedIssues: number;
    feedbackCount: number; discussionsCount: number; announcementsCount: number;
    anonymousShare: number; resolutionRate: number; avgResolutionHours: number | null;
  };
  issuesByCategory: Array<{ name: string; value: number }>;
  issuesByStatus: Array<{ name: string; value: number }>;
  issuesByPriority: Array<{ name: string; value: number }>;
  feedbackByType: Array<{ name: string; value: number }>;
  activityByDay: Array<{ day: string; issues: number; feedback: number; discussions: number }>;
  doubtsBySubject: Array<{ name: string; value: number }>;
  hotTopics: Array<{ topic: string; count: number }>;
  insights: Array<{ id: string; tone: string; title: string; detail: string; actions: string[] }>;
  provider: string;
}

const TONE: Record<string, { border: string; bg: string; icon: string; label: string }> = {
  positive: { border: "border-l-emerald-500", bg: "bg-emerald-50/50", icon: "✅", label: "Strength" },
  warning: { border: "border-l-amber-500", bg: "bg-amber-50/50", icon: "⚠️", label: "Needs attention" },
  info: { border: "border-l-sky-500", bg: "bg-sky-50/50", icon: "ℹ️", label: "Observation" },
};

export default function InsightsPage() {
  const { data, loading, error, refetch } = useApi<InsightsData>("/api/insights");

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="AI Insights"
        subtitle={`Rule-based intelligence over aggregated, anonymized platform data${data ? ` · engine: ${data.provider}` : ""}.`}
      />

      {loading && <LoadingBlock />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-6">
          {/* headline metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="card p-5">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Resolution rate</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{data.kpis.resolutionRate}%</p>
              <div className="h-2 rounded-full bg-ink-100 mt-3 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.kpis.resolutionRate}%` }} />
              </div>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Anonymous reports</p>
              <p className="text-3xl font-black text-ink-900 mt-1">{data.kpis.anonymousShare}%</p>
              <p className="text-xs text-ink-400 mt-2">of issues submitted anonymously — trust indicator</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Avg resolution time</p>
              <p className="text-3xl font-black text-ink-900 mt-1">{data.kpis.avgResolutionHours !== null ? `${data.kpis.avgResolutionHours}h` : "—"}</p>
              <p className="text-xs text-ink-400 mt-2">from submission to resolution</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider">Active issues</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{data.kpis.activeIssues}</p>
              <p className="text-xs text-ink-400 mt-2">{data.kpis.resolvedIssues} resolved or closed</p>
            </div>
          </div>

          {/* generated insights */}
          <section>
            <h2 className="section-title mb-3">Generated insights & suggested actions</h2>
            <div className="grid lg:grid-cols-2 gap-4">
              {data.insights.map((ins) => {
                const t = TONE[ins.tone] ?? TONE.info;
                return (
                  <div key={ins.id} className={`card p-5 border-l-4 ${t.border} ${t.bg}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span aria-hidden>{t.icon}</span>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-500">{t.label}</span>
                    </div>
                    <p className="font-bold text-ink-900">{ins.title}</p>
                    <p className="text-sm text-ink-600 mt-1.5 leading-relaxed">{ins.detail}</p>
                    <div className="mt-3 pt-3 border-t border-ink-200/60">
                      <p className="text-xs font-bold text-ink-500 uppercase tracking-wider mb-1.5">Suggested actions</p>
                      <ul className="space-y-1">
                        {ins.actions.map((a) => (
                          <li key={a} className="text-sm text-ink-700 flex gap-2"><span className="text-brand-600">→</span>{a}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
              {data.insights.length === 0 && <div className="card p-5 text-sm text-ink-400 lg:col-span-2">Not enough data yet — insights appear as students use the platform.</div>}
            </div>
          </section>

          {/* charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <section className="card p-5">
              <h2 className="section-title mb-3">Issue categories</h2>
              <BarChartCard data={data.issuesByCategory} xKey="name" bars={[{ key: "value", color: "#4f46e5", name: "Issues" }]} />
            </section>
            <section className="card p-5">
              <h2 className="section-title mb-3">Feedback composition</h2>
              <DonutChart data={data.feedbackByType} />
            </section>
            <section className="card p-5">
              <h2 className="section-title mb-3">Priority distribution</h2>
              <DonutChart data={data.issuesByPriority} />
            </section>
            <section className="card p-5">
              <h2 className="section-title mb-3">Academic doubt subjects</h2>
              <DonutChart data={data.doubtsBySubject} height={260} />
            </section>
          </div>

          <section className="card p-5">
            <h2 className="section-title mb-3">Campus engagement trend (14 days)</h2>
            <AreaTrend
              data={data.activityByDay}
              series={[
                { key: "issues", color: "#4f46e5", name: "Issues" },
                { key: "feedback", color: "#0ea5e9", name: "Feedback" },
                { key: "discussions", color: "#10b981", name: "Discussions" },
              ]}
            />
          </section>

          {/* hot topics */}
          <section className="card p-5">
            <h2 className="section-title mb-3">What students are asking about</h2>
            {data.hotTopics.length === 0 ? (
              <p className="text-sm text-ink-400">No academic activity captured yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.hotTopics.map((t) => (
                  <span key={t.topic} className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100 px-3 py-1.5 text-sm">
                    {t.topic} <span className="text-brand-400 font-black">×{t.count}</span>
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
