"use client";

import Link from "next/link";
import { PageHeading, useApi, LoadingBlock, ErrorState, timeAgo } from "@/components/shared";
import { StatusBadge, PriorityBadge } from "@/components/badges";
import { EmptyState } from "@/components/ui";

interface Dash {
  stats: { myIssues: number; activeIssues: number; resolved: number; feedback: number; unread: number; doubts: number };
  announcements: Array<{ id: number; title: string; category: string; priority: string; created_at: string }>;
  discussions: Array<{ id: number; title: string; category: string; created_at: string; comment_count: number }>;
  myIssues: Array<{ id: number; tracking_id: string; title: string; status: string; priority: string; updated_at: string }>;
}

const QUICK = [
  { href: "/student/issues?new=1", label: "Raise an Issue", desc: "Report a problem — anonymously if you prefer", icon: "🎫", tone: "from-rose-500 to-orange-500" },
  { href: "/student/feedback?new=1", label: "Give Feedback", desc: "Share suggestions, complaints & concerns", icon: "💬", tone: "from-sky-500 to-brand-600" },
  { href: "/student/discussions?new=1", label: "Ask a Doubt", desc: "Post in the community discussion board", icon: "❓", tone: "from-emerald-500 to-teal-600" },
  { href: "/student/discussions", label: "Discuss", desc: "Join trending campus conversations", icon: "🗣️", tone: "from-violet-500 to-fuchsia-600" },
  { href: "/student/announcements", label: "Announcements", desc: "Notices, exams, placements & events", icon: "📢", tone: "from-amber-500 to-yellow-600" },
  { href: "/student/ai", label: "AI Assistant", desc: "Chat with your academic co-pilot", icon: "🤖", tone: "from-brand-500 to-indigo-700" },
];

export default function StudentDashboard({ name }: { name: string }) {
  const { data, loading, error, refetch } = useApi<Dash>("/api/dashboard");
  const first = name.split(" ")[0];

  return (
    <div className="animate-fade-in">
      <PageHeading title={`Welcome back, ${first} 👋`} subtitle="Here's what's happening across your campus today." />

      {loading && <LoadingBlock />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="space-y-6">
          {/* stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "My Issues", value: data.stats.myIssues, icon: "🎫", tint: "bg-rose-50 text-rose-600" },
              { label: "Active", value: data.stats.activeIssues, icon: "⏳", tint: "bg-amber-50 text-amber-600" },
              { label: "Resolved", value: data.stats.resolved, icon: "✅", tint: "bg-emerald-50 text-emerald-600" },
              { label: "Unread alerts", value: data.stats.unread, icon: "🔔", tint: "bg-brand-50 text-brand-600" },
            ].map((s) => (
              <div key={s.label} className="card card-hover p-4 sm:p-5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg mb-3 ${s.tint}`} aria-hidden>{s.icon}</div>
                <p className="text-2xl sm:text-3xl font-black text-ink-900">{s.value}</p>
                <p className="text-xs font-semibold text-ink-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* quick actions */}
          <section>
            <h2 className="section-title mb-3">Quick actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {QUICK.map((q) => (
                <Link key={q.label} href={q.href} className="card card-hover p-4 sm:p-5 group relative overflow-hidden">
                  <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${q.tone} opacity-10 group-hover:opacity-25 transition-opacity`} aria-hidden />
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${q.tone} text-white text-lg mb-3 shadow-soft`} aria-hidden>{q.icon}</div>
                  <p className="font-bold text-ink-900 text-sm sm:text-base">{q.label}</p>
                  <p className="text-xs text-ink-500 mt-1 leading-relaxed">{q.desc}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* AI strip */}
          <section className="card p-5 sm:p-6 bg-gradient-to-r from-brand-700 via-brand-600 to-indigo-600 border-0 text-white overflow-hidden relative">
            <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/10" aria-hidden />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-100">INTERACTA Intelligence</p>
                <h2 className="text-xl font-black mt-1">Your AI study companion is ready</h2>
                <p className="text-sm text-brand-100 mt-1 max-w-xl">
                  {data.stats.doubts > 0
                    ? `You've asked ${data.stats.doubts} academic question${data.stats.doubts > 1 ? "s" : ""} so far. Continue with personalized recommendations.`
                    : "Ask your first academic doubt and get structured, step-by-step explanations."}
                </p>
              </div>
              <div className="flex gap-2.5 shrink-0">
                <Link href="/student/doubt-solver" className="btn bg-white text-brand-700 hover:bg-brand-50 shadow-soft">🧠 Doubt Solver</Link>
                <Link href="/student/learning" className="btn bg-white/15 text-white border border-white/30 hover:bg-white/25">📈 Learning</Link>
                <Link href="/student/career" className="btn bg-white/15 text-white border border-white/30 hover:bg-white/25 hidden sm:inline-flex">🎯 Career</Link>
              </div>
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* announcements */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Latest announcements</h2>
                <Link href="/student/announcements" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
              </div>
              {data.announcements.length === 0 ? (
                <EmptyState icon="📢" title="No announcements yet" body="College notices will appear here." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {data.announcements.map((a) => (
                    <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                      <Link href="/student/announcements" className="group block">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusBadge status={a.priority} />
                          <span className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">{a.category}</span>
                        </div>
                        <p className="text-sm font-semibold text-ink-800 group-hover:text-brand-700 transition-colors">{a.title}</p>
                        <p className="text-xs text-ink-400 mt-0.5">{timeAgo(a.created_at)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* my issues */}
            <section className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">My issues</h2>
                <Link href="/student/issues" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link>
              </div>
              {data.myIssues.length === 0 ? (
                <EmptyState icon="🎫" title="No issues yet" body="Raise your first issue — anonymously if you prefer." />
              ) : (
                <ul className="divide-y divide-ink-100">
                  {data.myIssues.map((i) => (
                    <li key={i.id} className="py-3 first:pt-0 last:pb-0">
                      <Link href="/student/issues" className="group flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-bold text-brand-700">{i.tracking_id}</p>
                          <p className="text-sm font-semibold text-ink-800 truncate group-hover:text-brand-700 transition-colors">{i.title}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={i.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* discussions */}
            <section className="card p-5 lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="section-title">Recent discussions</h2>
                <Link href="/student/discussions" className="text-sm font-semibold text-brand-600 hover:underline">Open board</Link>
              </div>
              {data.discussions.length === 0 ? (
                <EmptyState icon="🗣️" title="No discussions yet" body="Be the first to start a conversation." />
              ) : (
                <ul className="grid sm:grid-cols-2 gap-x-6 divide-y sm:divide-y-0 divide-ink-100">
                  {data.discussions.map((d) => (
                    <li key={d.id} className="py-3 border-b border-ink-100 sm:border-0 sm:first:pt-0 sm:last:pb-0">
                      <Link href={`/student/discussions/${d.id}`} className="group block">
                        <p className="text-sm font-semibold text-ink-800 group-hover:text-brand-700 transition-colors line-clamp-2-fix">{d.title}</p>
                        <p className="text-xs text-ink-400 mt-1">{d.category} · {d.comment_count} repl{d.comment_count === 1 ? "y" : "ies"} · {timeAgo(d.created_at)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
