import Link from "next/link";

const FEATURES = [
  { icon: "🎫", title: "Issue reporting with tracking", desc: "Students raise issues with unique tracking IDs and follow every step from SUBMITTED to RESOLVED." },
  { icon: "🕵️", title: "Anonymous by design", desc: "Fear of speaking up ends here. Anonymous reports protect identity while still reaching management." },
  { icon: "🤖", title: "AI academic companion", desc: "Doubt solver with structured answers, a conversational assistant, personalized learning and career roadmaps." },
  { icon: "📢", title: "Digital notice board", desc: "Exams, placements, workshops, clubs — categorized announcements with instant notifications." },
  { icon: "🗣️", title: "Community discussions", desc: "A moderated board for academics, placements and campus life — faculty join the conversation." },
  { icon: "📊", title: "AI insights for management", desc: "Aggregated, anonymized analytics turn thousands of student voices into clear, actionable decisions." },
];

const LOOP = [
  { step: "1", label: "Student raises concern" },
  { step: "2", label: "Stored in database" },
  { step: "3", label: "Admin reviews & assigns" },
  { step: "4", label: "Staff responds & resolves" },
  { step: "5", label: "Student notified" },
  { step: "6", label: "Aggregated into insights" },
  { step: "7", label: "Management decides" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* nav */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-ink-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black text-lg shadow-soft">I</span>
            <span className="font-black tracking-tight text-lg">INTERACTA</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost">Log in</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/80 via-white to-white" aria-hidden />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" aria-hidden />
        <div className="absolute top-40 -left-32 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
          <div className="badge bg-brand-100 text-brand-700 mx-auto mb-5 px-3.5 py-1.5">🎓 Built for college communities</div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-ink-900 leading-[1.05]">
            Every student voice,<br />
            <span className="bg-gradient-to-r from-brand-600 to-sky-500 bg-clip-text text-transparent">heard and resolved.</span>
          </h1>
          <p className="mt-5 text-lg text-ink-500 max-w-2xl mx-auto leading-relaxed">
            INTERACTA connects <strong className="text-ink-700">students</strong>, <strong className="text-ink-700">staff</strong> and{" "}
            <strong className="text-ink-700">management</strong> in one secure ecosystem — anonymous issue reporting, feedback,
            discussions, announcements and AI-powered academic support, with a resolution loop you can watch work.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="btn-primary !px-6 !py-3 !text-base">Try the live demo →</Link>
            <Link href="/register" className="btn-secondary !px-6 !py-3 !text-base">Create student account</Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-ink-400 font-medium">
            <span>✓ No installation — runs in your browser</span>
            <span>✓ Demo accounts for all 3 roles</span>
            <span>✓ Real database, real workflows</span>
          </div>
        </div>
      </section>

      {/* roles */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: "🎓", role: "Students", pts: ["Raise issues anonymously with tracking IDs", "Give feedback & suggestions directly to management", "AI doubt solver, learning paths & career roadmaps", "Discussions, announcements & notifications"], tone: "from-emerald-500 to-teal-600" },
            { icon: "👔", role: "Staff", pts: ["See assigned issues in a priority queue", "Respond with resolution notes", "Update status — student is notified instantly", "Join academic discussions"], tone: "from-sky-500 to-brand-600" },
            { icon: "🏛️", role: "Management", pts: ["Assign, track and resolve every issue", "Publish announcements campus-wide", "AI insights over aggregated student voice", "Make data-driven decisions"], tone: "from-brand-500 to-indigo-700" },
          ].map((r) => (
            <div key={r.role} className="card card-hover p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${r.tone} text-white text-2xl mb-4 shadow-soft`} aria-hidden>{r.icon}</div>
              <h3 className="font-black text-lg text-ink-900">{r.role}</h3>
              <ul className="mt-3 space-y-2">
                {r.pts.map((p) => (
                  <li key={p} className="text-sm text-ink-600 flex gap-2"><span className="text-brand-500 mt-0.5">▸</span>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* communication loop */}
      <section className="bg-ink-900 text-white py-16 mt-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-300">The core innovation</p>
            <h2 className="text-3xl sm:text-4xl font-black mt-2">The communication loop</h2>
            <p className="text-ink-300 mt-3 max-w-2xl mx-auto">
              Not a suggestion box — a closed loop. Every action flows through the platform, every response reaches the student, every pattern reaches management.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {LOOP.map((s) => (
              <div key={s.step} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 font-black text-sm">{s.step}</span>
                <p className="text-xs font-semibold mt-2.5 leading-snug text-ink-100">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-black text-ink-900">One platform, every conversation</h2>
          <p className="text-ink-500 mt-3">Everything a college community needs to listen, respond and grow.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover p-6">
              <div className="text-2xl mb-3" aria-hidden>{f.icon}</div>
              <h3 className="font-bold text-ink-900">{f.title}</h3>
              <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* demo credentials */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="card p-6 sm:p-8 bg-gradient-to-br from-brand-50 to-sky-50 border-brand-100">
          <h2 className="text-2xl font-black text-ink-900 text-center">Take it for a spin</h2>
          <p className="text-center text-sm text-ink-500 mt-2">Log in with any demo account — password: <code className="bg-white rounded px-2 py-0.5 font-mono font-bold text-ink-800">password123</code></p>
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {[
              { role: "STUDENT", email: "student@interacta.edu", who: "Aarav Sharma · CSE", tone: "bg-emerald-100 text-emerald-700" },
              { role: "STAFF", email: "raghav.menon@interacta.edu", who: "Raghav Menon · Facilities", tone: "bg-sky-100 text-sky-700" },
              { role: "ADMIN", email: "admin@interacta.edu", who: "Dr. Meera Krishnan", tone: "bg-brand-100 text-brand-700" },
            ].map((a) => (
              <div key={a.email} className="card p-4 text-center !bg-white/80">
                <span className={`badge ${a.tone} mx-auto`}>{a.role}</span>
                <p className="font-mono text-xs mt-3 text-ink-700 break-all">{a.email}</p>
                <p className="text-xs text-ink-400 mt-1">{a.who}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link href="/login" className="btn-primary !px-8 !py-3">Open the demo →</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-ink-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-400">
          <p><span className="font-black text-ink-600">INTERACTA</span> — College Community Interaction Platform</p>
          <p>Connecting students · staff · management</p>
        </div>
      </footer>
    </div>
  );
}
