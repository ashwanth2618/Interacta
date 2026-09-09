"use client";

import { PageHeading, useApi, LoadingBlock, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui";

interface LearningData {
  recommendations: Array<{ topic: string; subject: string; reason: string; kind: "reinforce" | "advance" | "explore"; resources: string[] }>;
  weakAreas: Array<{ subject: string; doubts: number }>;
  roadmap: Array<{ week: string; focus: string; goal: string }>;
  practiceSuggestions: string[];
  activityCount: number;
}

const KIND_META: Record<string, { label: string; cls: string }> = {
  reinforce: { label: "🔁 Reinforce", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  advance: { label: "🚀 Advance", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  explore: { label: "🧭 Explore", cls: "bg-violet-50 text-violet-700 ring-1 ring-violet-200" },
};

export default function LearningPage() {
  const { data, loading, error, refetch } = useApi<LearningData>("/api/learning");

  return (
    <div className="animate-fade-in">
      <PageHeading title="Personalized Learning" subtitle="Recommendations generated from your doubts, discussions and AI activity." />

      {loading && <LoadingBlock />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-6">
          {data.activityCount === 0 ? (
            <div className="card">
              <EmptyState icon="📈" title="No learning activity yet"
                body="Ask doubts in the AI Doubt Solver or join discussions — your recommendations will build from that activity."
                action={<a className="btn-primary" href="/student/doubt-solver">Try the Doubt Solver</a>} />
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-6">
                {/* recommendations */}
                <section className="lg:col-span-1">
                  <h2 className="section-title mb-3">Recommended topics</h2>
                  <div className="space-y-3">
                    {data.recommendations.map((r, i) => (
                      <div key={i} className="card card-hover p-4">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className={`badge ${KIND_META[r.kind].cls}`}>{KIND_META[r.kind].label}</span>
                          <span className="badge bg-ink-100 text-ink-600">{r.subject}</span>
                        </div>
                        <h3 className="font-bold text-ink-900">{r.topic}</h3>
                        <p className="text-xs text-ink-500 mt-1">{r.reason}</p>
                        {r.resources.length > 0 && (
                          <ul className="mt-2.5 space-y-1">
                            {r.resources.map((res) => (
                              <li key={res} className="text-xs text-ink-600 flex items-center gap-1.5"><span className="text-brand-500">▸</span>{res}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <div className="space-y-6">
                  {/* weak areas */}
                  <section>
                    <h2 className="section-title mb-3">Focus areas (from your doubts)</h2>
                    <div className="card p-5 space-y-3.5">
                      {data.weakAreas.map((w) => {
                        const max = Math.max(...data.weakAreas.map((x) => x.doubts));
                        return (
                          <div key={w.subject}>
                            <div className="flex justify-between text-sm mb-1.5">
                              <span className="font-semibold text-ink-800">{w.subject}</span>
                              <span className="text-ink-500">{w.doubts} activit{w.doubts === 1 ? "y" : "ies"}</span>
                            </div>
                            <div className="h-2 rounded-full bg-ink-100 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500" style={{ width: `${(w.doubts / max) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* practice */}
                  <section>
                    <h2 className="section-title mb-3">Practice suggestions</h2>
                    <div className="card p-5 space-y-2.5">
                      {data.practiceSuggestions.map((p, i) => (
                        <p key={i} className="text-sm text-ink-700 flex gap-2.5"><span className="text-brand-500">✓</span>{p}</p>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              {/* roadmap */}
              <section>
                <h2 className="section-title mb-3">Your learning roadmap</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {data.roadmap.map((r, i) => (
                    <div key={i} className={`card p-4 ${i === 0 ? "ring-2 ring-brand-500/40" : ""}`}>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-600">{r.week}</p>
                      <p className="font-bold text-ink-900 mt-1 text-sm">{r.focus}</p>
                      <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">{r.goal}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
