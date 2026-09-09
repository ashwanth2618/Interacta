"use client";

import { useState } from "react";
import { PageHeading, useApi, timeAgo } from "@/components/shared";
import { Modal, useToast, Spinner, EmptyState, Avatar } from "@/components/ui";
import { StatusBadge } from "@/components/badges";

interface StaffRow {
  id: number; name: string; email: string; role: string; status: string;
  department: string | null; designation: string | null; employee_id: string | null;
  avatar_color: string; active_issues: number; resolved_issues: number; created_at?: string;
}

const EMPTY = { name: "", email: "", department: "", designation: "", employeeId: "", role: "STAFF", password: "" };

export default function AdminStaffPage() {
  const toast = useToast();
  const { data, loading, error, refetch } = useApi<{ staff: StaffRow[] }>("/api/staff");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.name.trim().length < 2 || !form.email || !form.department || (creating && form.password.length < 8)) {
      toast("error", "Name, email, department are required; password needs 8+ characters for new staff");
      return;
    }
    setSaving(true);
    try {
      if (creating) {
        const res = await fetch("/api/staff", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, name: form.name.trim(), email: form.email.trim() }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to create staff");
        toast("success", "Staff account created — they can log in immediately");
      } else if (editing) {
        const res = await fetch("/api/staff", {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id, name: form.name.trim(), department: form.department.trim(),
            designation: form.designation.trim(), employeeId: form.employeeId.trim(),
          }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to update");
        toast("success", "Staff details updated");
      }
      setCreating(false); setEditing(null); refetch();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (s: StaffRow) => {
    const res = await fetch("/api/staff", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, action: "toggleStatus" }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { toast("error", j.error || "Failed"); return; }
    toast("success", j.status === "ACTIVE" ? `${s.name} activated` : `${s.name} deactivated — they can no longer log in`);
    refetch();
  };

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Staff Management"
        subtitle="Create staff accounts, manage departments and track issue workload."
        action={<button className="btn-primary" onClick={() => { setForm(EMPTY); setCreating(true); }}>+ Add staff member</button>}
      />

      {loading && <div className="card p-10 flex justify-center"><Spinner className="text-brand-500 w-8 h-8" /></div>}
      {error && <div className="card py-10 text-center text-sm text-rose-600">{error}</div>}

      {data && (data.staff.length === 0 ? (
        <div className="card"><EmptyState icon="👔" title="No staff yet" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-ink-50 border-b border-ink-100">
                <tr>
                  <th className="th">Member</th>
                  <th className="th">Role</th>
                  <th className="th">Department</th>
                  <th className="th">Designation</th>
                  <th className="th">Employee ID</th>
                  <th className="th">Workload</th>
                  <th className="th">Status</th>
                  <th className="th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.staff.map((s) => (
                  <tr key={s.id} className="hover:bg-brand-50/40">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} color={s.avatar_color} size={34} />
                        <div className="min-w-0">
                          <p className="font-semibold text-ink-900 truncate">{s.name}</p>
                          <p className="text-xs text-ink-400 truncate">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td"><span className={`badge ${s.role === "ADMIN" ? "bg-brand-100 text-brand-700" : "bg-ink-100 text-ink-600"}`}>{s.role}</span></td>
                    <td className="td">{s.department ?? "—"}</td>
                    <td className="td">{s.designation ?? "—"}</td>
                    <td className="td font-mono text-xs">{s.employee_id ?? "—"}</td>
                    <td className="td">
                      <span className="text-amber-600 font-semibold">{s.active_issues} active</span>
                      <span className="text-ink-300 mx-1">·</span>
                      <span className="text-emerald-600 font-semibold">{s.resolved_issues} done</span>
                    </td>
                    <td className="td"><StatusBadge status={s.status} /></td>
                    <td className="td">
                      <div className="flex gap-1.5">
                        <button className="btn-secondary !py-1.5 !px-2.5 text-xs"
                          onClick={() => { setEditing(s); setForm({ name: s.name, email: s.email, department: s.department ?? "", designation: s.designation ?? "", employeeId: s.employee_id ?? "", role: s.role, password: "" }); }}>
                          Edit
                        </button>
                        <button className={`btn !py-1.5 !px-2.5 text-xs ${s.status === "ACTIVE" ? "bg-ink-100 text-ink-600 hover:bg-ink-200" : "btn-primary"}`}
                          onClick={() => toggleStatus(s)}>
                          {s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <Modal open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} title={editing ? `Edit ${editing.name}` : "Add staff member"}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="st-name">Full name *</label>
              <input id="st-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="st-email">Email *</label>
              <input id="st-email" type="email" className="input" value={form.email} disabled={!!editing}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="st-dept">Department *</label>
              <input id="st-dept" className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="st-desig">Designation</label>
              <input id="st-desig" className="input" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g., Associate Professor" />
            </div>
            <div>
              <label className="label" htmlFor="st-emp">Employee ID</label>
              <input id="st-emp" className="input" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
            </div>
            {creating && (
              <div>
                <label className="label" htmlFor="st-role">Role *</label>
                <select id="st-role" className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            )}
          </div>
          {creating && (
            <div>
              <label className="label" htmlFor="st-pass">Initial password *</label>
              <input id="st-pass" type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <p className="text-xs text-ink-400 mt-1">Minimum 8 characters. Share it securely — the user should change habits accordingly.</p>
            </div>
          )}
          <div className="flex justify-end gap-2.5">
            <button type="button" className="btn-secondary" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner className="w-4 h-4" /> : editing ? "Save changes" : "Create account"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
