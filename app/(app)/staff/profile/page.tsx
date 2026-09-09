"use client";

import { useEffect, useState } from "react";
import { PageHeading, useApi, LoadingBlock } from "@/components/shared";
import { useToast, Spinner, Avatar } from "@/components/ui";

interface ProfileData {
  profile: {
    id: number; name: string; email: string; role: string; department: string | null;
    designation: string | null; employeeId: string | null; createdAt: string;
  };
}

export default function StaffProfilePage() {
  const toast = useToast();
  const { data, loading, refetch } = useApi<ProfileData>("/api/profile");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data?.profile) setName(data.profile.name); }, [data]);

  const save = async () => {
    if (name.trim().length < 2) { toast("error", "Name must be at least 2 characters"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save");
      toast("success", "Profile updated");
      refetch();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock />;
  const p = data?.profile;
  if (!p) return null;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <PageHeading title="My Profile" />
      <div className="card p-6 mb-5 flex items-center gap-4">
        <Avatar name={p.name} size={64} />
        <div>
          <h2 className="text-lg font-black text-ink-900">{p.name}</h2>
          <p className="text-sm text-ink-500">{p.email}</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100">{p.role}</span>
            {p.department && <span className="badge bg-ink-100 text-ink-600">{p.department}</span>}
            {p.designation && <span className="badge bg-ink-100 text-ink-600">{p.designation}</span>}
            {p.employeeId && <span className="badge bg-ink-100 text-ink-600">Emp ID: {p.employeeId}</span>}
          </div>
        </div>
      </div>
      <div className="card p-6">
        <label className="label" htmlFor="sp-name">Display name</label>
        <div className="flex gap-2.5 max-w-md">
          <input id="sp-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <Spinner className="w-4 h-4" /> : "Save"}
          </button>
        </div>
        <p className="text-xs text-ink-400 mt-2">Department and designation are managed by the admin office.</p>
      </div>
    </div>
  );
}
