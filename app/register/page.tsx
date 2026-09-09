"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";

const DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics & Communication", "Electrical", "Mechanical Engineering", "Civil Engineering", "Business Administration"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", studentId: "", department: "", year: "1st Year", course: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email address";
    if (form.password.length < 8) e.password = "Password must be at least 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    if (!form.studentId.trim()) e.studentId = "Student ID is required";
    if (!form.department) e.department = "Choose your department";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), email: form.email.trim(), password: form.password,
          studentId: form.studentId.trim(), department: form.department, year: form.year, course: form.course.trim(),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Registration failed");
      router.push("/student");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed");
      setSubmitting(false);
    }
  };

  const field = (key: string) => (errors[key] ? "input input-error" : "input");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-sky-50 p-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-black text-xl shadow-lift">I</span>
            <span className="font-black tracking-tight text-2xl text-ink-900">INTERACTA</span>
          </Link>
          <p className="text-sm text-ink-500 mt-2">Create your student account</p>
        </div>

        <div className="card p-6 sm:p-8 animate-fade-up">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="reg-name">Full name *</label>
              <input id="reg-name" className={field("name")} placeholder="e.g., Priya Sharma" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
              {errors.name && <p className="mt-1 text-xs font-medium text-rose-600">{errors.name}</p>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="reg-email">College email *</label>
                <input id="reg-email" type="email" className={field("email")} placeholder="you@interacta.edu" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
                {errors.email && <p className="mt-1 text-xs font-medium text-rose-600">{errors.email}</p>}
              </div>
              <div>
                <label className="label" htmlFor="reg-sid">Student ID *</label>
                <input id="reg-sid" className={field("studentId")} placeholder="e.g., CS23B087" value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })} />
                {errors.studentId && <p className="mt-1 text-xs font-medium text-rose-600">{errors.studentId}</p>}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="reg-dept">Department *</label>
                <select id="reg-dept" className={field("department")} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                  <option value="">Select…</option>
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
                {errors.department && <p className="mt-1 text-xs font-medium text-rose-600">{errors.department}</p>}
              </div>
              <div>
                <label className="label" htmlFor="reg-year">Year</label>
                <select id="reg-year" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
                  {YEARS.map((y) => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="reg-course">Course</label>
              <input id="reg-course" className="input" placeholder="e.g., B.Tech CSE" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="reg-pass">Password *</label>
                <input id="reg-pass" type="password" className={field("password")} placeholder="Min 8 characters" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                {errors.password && <p className="mt-1 text-xs font-medium text-rose-600">{errors.password}</p>}
              </div>
              <div>
                <label className="label" htmlFor="reg-confirm">Confirm password *</label>
                <input id="reg-confirm" type="password" className={field("confirm")} placeholder="Repeat password" value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
                {errors.confirm && <p className="mt-1 text-xs font-medium text-rose-600">{errors.confirm}</p>}
              </div>
            </div>

            {serverError && (
              <p className="rounded-xl bg-rose-50 border border-rose-100 px-3.5 py-2.5 text-sm font-medium text-rose-700" role="alert">{serverError}</p>
            )}

            <button type="submit" className="btn-primary w-full !py-3" disabled={submitting}>
              {submitting ? <><Spinner className="w-4 h-4" /> Creating account…</> : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-500 mt-5">
          Already have an account? <Link href="/login" className="font-bold text-brand-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
