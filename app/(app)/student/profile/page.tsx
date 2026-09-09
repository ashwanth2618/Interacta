"use client";

import { useEffect, useState } from "react";
import { PageHeading, useApi, LoadingBlock } from "@/components/shared";
import { useToast, Spinner } from "@/components/ui";
import { Avatar } from "@/components/ui";

interface ProfileData {
  profile: {
    id: number; name: string; email: string; role: string; department: string | null;
    studentId: string | null; year: string | null; course: string | null;
    designation: string | null; employeeId: string | null;
    skills: string[]; interests: string[]; careerPreference: string | null; createdAt: string;
  };
}

const SKILL_SUGGESTIONS = ["Java", "Python", "C++", "JavaScript", "React", "SQL", "Git", "Communication", "Machine Learning", "AutoCAD"];
const INTEREST_SUGGESTIONS = ["Web Development", "Machine Learning", "Data Science", "Embedded Systems", "IoT", "Cloud", "Design", "Business"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];

export default function ProfilePage() {
  const toast = useToast();
  const { data, loading, refetch } = useApi<ProfileData>("/api/profile");
  const [form, setForm] = useState({ name: "", department: "", year: "", course: "", skills: [] as string[], interests: [] as string[], careerPreference: "" });
  const [saving, setSaving] = useState(false);
  const [newSkill, setNewSkill] = useState("");
  const [newInterest, setNewInterest] = useState("");

  useEffect(() => {
    if (data?.profile) {
      const p = data.profile;
      setForm({
        name: p.name, department: p.department ?? "", year: p.year ?? "",
        course: p.course ?? "", skills: p.skills, interests: p.interests,
        careerPreference: p.careerPreference ?? "",
      });
    }
  }, [data]);

  const save = async () => {
    if (form.name.trim().length < 2) { toast("error", "Name must be at least 2 characters"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to save");
      toast("success", "Profile updated — recommendations will refresh");
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
    <div className="animate-fade-in max-w-3xl mx-auto">
      <PageHeading title="My Profile" subtitle="Your details power personalized learning and career recommendations." />

      <div className="card p-5 sm:p-6 mb-5 flex items-center gap-4">
        <Avatar name={p.name} size={64} />
        <div className="min-w-0">
          <h2 className="text-lg font-black text-ink-900 truncate">{p.name}</h2>
          <p className="text-sm text-ink-500 truncate">{p.email}</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100">{p.role}</span>
            {p.studentId && <span className="badge bg-ink-100 text-ink-600">ID: {p.studentId}</span>}
            {p.department && <span className="badge bg-ink-100 text-ink-600">{p.department}</span>}
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6 space-y-4">
        <h3 className="section-title">Edit profile</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="pf-name">Full name</label>
            <input id="pf-name" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="pf-dept">Department</label>
            <input id="pf-dept" className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div>
            <label className="label" htmlFor="pf-year">Year</label>
            <select id="pf-year" className="input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })}>
              <option value="">Not set</option>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pf-course">Course</label>
            <input id="pf-course" className="input" value={form.course} placeholder="e.g., B.Tech CSE" onChange={(e) => setForm({ ...form, course: e.target.value })} />
          </div>
        </div>

        <div>
          <p className="label">Skills</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.skills.map((s) => (
              <span key={s} className="badge bg-brand-600 text-white cursor-pointer" onClick={() => setForm({ ...form, skills: form.skills.filter((x) => x !== s) })} title="Click to remove">
                {s} ×
              </span>
            ))}
            {form.skills.length === 0 && <span className="text-xs text-ink-400">No skills added yet</span>}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Add a skill…" value={newSkill} onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newSkill.trim()) { e.preventDefault(); setForm({ ...form, skills: [...new Set([...form.skills, newSkill.trim()])] }); setNewSkill(""); } }} />
            <button className="btn-secondary" type="button" onClick={() => { if (newSkill.trim()) { setForm({ ...form, skills: [...new Set([...form.skills, newSkill.trim()])] }); setNewSkill(""); } }}>Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {SKILL_SUGGESTIONS.filter((s) => !form.skills.includes(s)).slice(0, 6).map((s) => (
              <button key={s} type="button" className="badge bg-ink-100 text-ink-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
                onClick={() => setForm({ ...form, skills: [...form.skills, s] })}>+ {s}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="label">Interests</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.interests.map((s) => (
              <span key={s} className="badge bg-violet-600 text-white cursor-pointer" onClick={() => setForm({ ...form, interests: form.interests.filter((x) => x !== s) })} title="Click to remove">
                {s} ×
              </span>
            ))}
            {form.interests.length === 0 && <span className="text-xs text-ink-400">No interests added yet</span>}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Add an interest…" value={newInterest} onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newInterest.trim()) { e.preventDefault(); setForm({ ...form, interests: [...new Set([...form.interests, newInterest.trim()])] }); setNewInterest(""); } }} />
            <button className="btn-secondary" type="button" onClick={() => { if (newInterest.trim()) { setForm({ ...form, interests: [...new Set([...form.interests, newInterest.trim()])] }); setNewInterest(""); } }}>Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {INTEREST_SUGGESTIONS.filter((s) => !form.interests.includes(s)).slice(0, 6).map((s) => (
              <button key={s} type="button" className="badge bg-ink-100 text-ink-500 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
                onClick={() => setForm({ ...form, interests: [...form.interests, s] })}>+ {s}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="pf-career">Career preference</label>
          <input id="pf-career" className="input" placeholder="e.g., Software Engineer" value={form.careerPreference}
            onChange={(e) => setForm({ ...form, careerPreference: e.target.value })} />
        </div>

        <div className="flex justify-end pt-2">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? <><Spinner className="w-4 h-4" /> Saving…</> : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
