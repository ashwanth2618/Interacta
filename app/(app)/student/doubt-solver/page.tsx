"use client";

import { useEffect, useState } from "react";
import { PageHeading, timeAgo } from "@/components/shared";
import { useToast, Spinner, EmptyState } from "@/components/ui";

interface DoubtResult {
  answer: string; simple: string; steps: string[]; example: string;
  related: string[]; nextTopic: string; source: string;
}

const EXAMPLES = [
  "What is polymorphism in Java?",
  "Explain normalization in DBMS",
  "How does a deadlock occur in OS?",
  "Difference between TCP and UDP?",
  "Explain pointers in C with example",
];

export default function DoubtSolverPage() {
  const toast = useToast();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<DoubtResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ question: string; at: string }>>([]);

  const loadHistory = () =>
    fetch("/api/ai/doubt").then((r) => r.json()).then((j) => setHistory(j.history ?? []));

  useEffect(() => { loadHistory(); }, []);

  const solve = async (q: string) => {
    const question = q.trim();
    if (question.length < 5) { toast("error", "Please enter a question (at least 5 characters)"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/doubt", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to solve");
      setResult(j.result);
      loadHistory();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to solve");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <PageHeading title="AI Doubt Solver" subtitle="Structured answers: explanation, steps, example and next topics." />

      <div className="card p-5">
        <form onSubmit={(e) => { e.preventDefault(); solve(question); }} className="flex flex-col sm:flex-row gap-2.5">
          <input className="input flex-1" placeholder="Type your academic doubt… e.g., Explain SQL joins with example"
            value={question} onChange={(e) => setQuestion(e.target.value)} aria-label="Your doubt" />
          <button className="btn-primary" disabled={loading || question.trim().length < 5}>
            {loading ? <><Spinner className="w-4 h-4" /> Solving…</> : "🧠 Solve doubt"}
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((e) => (
            <button key={e} className="badge bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700 transition-colors cursor-pointer"
              onClick={() => { setQuestion(e); solve(e); }}>“{e}”</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card p-8 mt-4 space-y-3" aria-hidden>
          <div className="skeleton h-5 w-1/3" /><div className="skeleton h-3 w-full" /><div className="skeleton h-3 w-5/6" /><div className="skeleton h-3 w-4/6" />
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4 animate-fade-up">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5 border-l-4 !border-l-brand-600">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-600 mb-1.5">1 · Answer</p>
              <p className="text-sm text-ink-800 leading-relaxed">{result.answer}</p>
            </div>
            <div className="card p-5 border-l-4 !border-l-sky-500">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600 mb-1.5">2 · Simple explanation</p>
              <p className="text-sm text-ink-800 leading-relaxed">{result.simple}</p>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">3 · Step-by-step solution</p>
            <ol className="space-y-2">
              {result.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-800">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">{i + 1}</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">4 · Example</p>
            <pre className="text-xs bg-ink-900 text-ink-100 rounded-xl p-4 overflow-x-auto leading-relaxed"><code>{result.example}</code></pre>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-600 mb-2">5 · Related concepts</p>
              <div className="flex flex-wrap gap-2">
                {result.related.map((r) => <span key={r} className="badge bg-violet-50 text-violet-700 ring-1 ring-violet-100">{r}</span>)}
              </div>
            </div>
            <div className="card p-5 border-l-4 !border-l-fuchsia-500">
              <p className="text-xs font-bold uppercase tracking-wider text-fuchsia-600 mb-1.5">6 · Suggested next topic</p>
              <p className="text-sm text-ink-800">{result.nextTopic}</p>
            </div>
          </div>

          <p className="text-[11px] text-ink-400 text-center">Engine: {result.source} · answers are study aids; verify with your prescribed textbooks.</p>
        </div>
      )}

      {!result && !loading && (
        <div className="card mt-4">
          <EmptyState icon="🧠" title="Ask your first doubt" body="Perfect for programming, mathematics, science and engineering subjects. Your history appears here." />
          {history.length > 0 && (
            <div className="px-5 pb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-2">Recent doubts</p>
              <ul className="space-y-1.5">
                {history.map((h, i) => (
                  <li key={i}>
                    <button className="text-sm text-brand-600 hover:underline text-left" onClick={() => { setQuestion(h.question); solve(h.question); }}>
                      {h.question} <span className="text-ink-400 text-xs">· {timeAgo(h.at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
