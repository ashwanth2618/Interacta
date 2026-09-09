"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui";

const DEMO = [
  { label: "Student", email: "student@interacta.edu", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { label: "Staff", email: "raghav.menon@interacta.edu", tone: "bg-sky-50 text-sky-700 border-sky-200" },
  { label: "Admin", email: "admin@interacta.edu", tone: "bg-brand-50 text-brand-700 border-brand-200" },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e?: React.FormEvent, override?: { email: string }) => {
    e?.preventDefault();
    const em = override?.email ?? email;
    if (!em || (!override && !password)) { setError("Please enter your email and password"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: override ? "password123" : password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Login failed");
      const home = j.user.role === "ADMIN" ? "/admin" : j.user.role === "STAFF" ? "/staff" : "/student";
      const next = sp.get("next");
      router.push(next && next.startsWith("/") ? next : home);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black text-xl shadow-lift">I</span>
            <span className="font-black tracking-tight text-2xl text-ink-900">INTERACTA</span>
          </Link>
          <p className="text-sm text-ink-500 mt-2">College Community Interaction Platform</p>
        </div>

        <div className="card p-6 sm:p-8 animate-fade-up">
          <h1 className="text-xl font-black text-ink-900">Welcome back</h1>
          <p className="text-sm text-ink-500 mt-1 mb-5">Log in to your role-based workspace.</p>

          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="login-email">Email</label>
              <input id="login-email" type="email" className="input" placeholder="you@interacta.edu"
                value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="login-pass">Password</label>
              <input id="login-pass" type="password" className="input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            {error && (
              <p className="rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5 text-sm font-medium text-rose-700" role="alert">{error}</p>
            )}
            <button type="submit" className="btn-primary w-full !py-3" disabled={submitting}>
              {submitting ? <><Spinner className="w-4 h-4" /> Signing in…</> : "Sign in"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-ink-200 flex-1" /><span className="text-xs font-semibold text-ink-400 uppercase">Demo accounts</span><div className="h-px bg-ink-200 flex-1" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {DEMO.map((d) => (
              <button key={d.email} className={`rounded-xl border px-2 py-2.5 text-xs font-bold transition-all hover:-translate-y-0.5 hover:shadow-soft ${d.tone}`}
                onClick={() => submit(undefined, { email: d.email })} disabled={submitting}>
                {d.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-400 text-center mt-3">One-click demo login · password123</p>
        </div>

        <p className="text-center text-sm text-ink-500 mt-5">
          New student? <Link href="/register" className="font-bold text-brand-600 hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
