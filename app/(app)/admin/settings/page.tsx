"use client";

import { PageHeading, useApi } from "@/components/shared";

interface SettingsData {
  kpis: { totalStudents: number; totalStaff: number; anonymousShare: number };
  provider: string;
}

export default function AdminSettingsPage() {
  const { data } = useApi<SettingsData & { kpis: { totalStudents: number; totalStaff: number; anonymousShare: number } }>("/api/insights");

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <PageHeading title="Settings" subtitle="Platform configuration and security posture." />

      <div className="space-y-4">
        <div className="card p-5">
          <h2 className="section-title mb-3">Platform</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Name</dt><dd className="font-semibold">INTERACTA — College Community Interaction Platform</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Roles</dt><dd className="font-semibold">STUDENT · STAFF · ADMIN</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">AI engine</dt><dd className="font-semibold">{data?.provider ?? "knowledge-base"} (set OPENAI_API_KEY for generative mode)</dd></div>
            <div className="flex justify-between"><dt className="text-ink-500">Database</dt><dd className="font-semibold">SQLite (WAL) — interacta.db</dd></div>
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-3">Security</h2>
          <ul className="space-y-2 text-sm text-ink-700">
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Passwords hashed with bcrypt (never stored or logged in plain text)</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> HttpOnly JWT session cookies (7-day expiry)</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Role-based authorization on every API route and page</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Anonymous reports: identity excluded from responses and analytics</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Input validation on all writes; parameterized SQL throughout</li>
            <li className="flex gap-2"><span className="text-emerald-500">✓</span> Secrets via environment variables (AUTH_SECRET, OPENAI_API_KEY)</li>
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-3">Demo accounts</h2>
          <p className="text-xs text-ink-500 mb-3">All demo accounts use the password <code className="bg-ink-100 rounded px-1.5 py-0.5 font-mono">password123</code></p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-ink-400 border-b border-ink-100">
                  <th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Email</th><th className="py-2">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                <tr><td className="py-2.5 pr-4"><span className="badge bg-brand-100 text-brand-700">ADMIN</span></td><td className="py-2.5 pr-4 font-mono text-xs">admin@interacta.edu</td><td className="py-2.5">Dr. Meera Krishnan</td></tr>
                <tr><td className="py-2.5 pr-4"><span className="badge bg-sky-100 text-sky-700">STAFF</span></td><td className="py-2.5 pr-4 font-mono text-xs">anil.verma@interacta.edu</td><td className="py-2.5">Prof. Anil Verma (CSE)</td></tr>
                <tr><td className="py-2.5 pr-4"><span className="badge bg-sky-100 text-sky-700">STAFF</span></td><td className="py-2.5 pr-4 font-mono text-xs">raghav.menon@interacta.edu</td><td className="py-2.5">Mr. Raghav Menon (Facilities)</td></tr>
                <tr><td className="py-2.5 pr-4"><span className="badge bg-emerald-100 text-emerald-700">STUDENT</span></td><td className="py-2.5 pr-4 font-mono text-xs">student@interacta.edu</td><td className="py-2.5">Aarav Sharma (CSE, 3rd yr)</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
