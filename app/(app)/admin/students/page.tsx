"use client";

import { PageHeading, useApi, timeAgo } from "@/components/shared";
import { Spinner, EmptyState, Avatar } from "@/components/ui";
import { StatusBadge } from "@/components/badges";

interface StudentRow {
  id: number; name: string; email: string; student_id: string | null; department: string | null;
  year: string | null; course: string | null; status: string; avatar_color: string;
  issues: number; feedback: number; discussions: number; activities: number; created_at: string;
}

export default function AdminStudentsPage() {
  const { data, loading, error, refetch } = useApi<{ students: StudentRow[] }>("/api/students");

  return (
    <div className="animate-fade-in">
      <PageHeading title="Students" subtitle="Directory and engagement overview. Private details stay protected." />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}

      {data && (data.students.length === 0 ? (
        <div className="card"><EmptyState icon="🎓" title="No students registered yet" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-ink-50 border-b border-ink-100">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Dept / Year</th>
                  <th className="th">Issues</th>
                  <th className="th">Feedback</th>
                  <th className="th">Discussions</th>
                  <th className="th">AI activity</th>
                  <th className="th">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.students.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-50/40">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} color={s.avatar_color} size={34} />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900 truncate">{s.name}</p>
                          <p className="text-xs text-ink-400 truncate">{s.student_id ?? s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td">{s.department ?? "—"}{s.year ? <span className="text-ink-400"> · {s.year}</span> : null}</td>
                    <td className="td font-semibold">{s.issues}</td>
                    <td className="td font-semibold">{s.feedback}</td>
                    <td className="td font-semibold">{s.discussions}</td>
                    <td className="td font-semibold">{s.activities}</td>
                    <td className="td text-ink-400 text-xs">{timeAgo(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
