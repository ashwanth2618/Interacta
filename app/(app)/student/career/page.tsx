"use client";

import { useEffect, useState } from "react";
import { PageHeading, useApi, LoadingBlock } from "@/components/shared";
import { useToast, Spinner } from "@/components/ui";

interface CareerResult {
  headline: string;
  paths: Array<{ title: string; description: string; demand: string; skills: string[] }>;
  skillsToLearn: string[];
  roadmap: Array<{ phase: string; duration: string; items: string[] }>;
  placementPrep: string[];
  interviewPrep: string[];
  projects: string[];
  source: string;
}

const DEPARTMENTS = ["Computer Science", "Information Technology", "Electronics & Communication", "Electrical", "Mechanical Engineering", "Civil Engineering", "Business Administration"];
const SKILL_POOL = ["Java", "Python", "C++", "C", "JavaScript", "React", "SQL", "Spring Boot", "MATLAB", "AutoCAD", "SolidWorks", "Git", "Excel", "Communication", "Machine Learning"];
const INTEREST_POOL = ["Web Development", "Machine Learning", "Data Science", "Embedded Systems", "IoT", "Cloud", "Cybersecurity", "Design", "Automotive", "Business"];
const CAREERS = ["Software Engineer", "Frontend Developer", "Backend Developer", "Full-Stack Developer", "Data Analyst", "Data Scientist", "ML Engineer", "Embedded Engineer", "Design Engineer", "Business Analyst", "Higher Studies / GATE", "Startup / Entrepreneurship"];

export default function CareerPage() {
  const toast = useToast();
  const { data: saved, loading } = useApi<{ careerProfile: { degree: string; department: string; skills: string[]; interests: string[]; preferredCareer: string; experienceLevel: string } | null }>("/api/career");

  const [form, setForm] = useState({ degree: "B.Tech", department: "", skills: [] as string[], interests: [] as string[], preferredCareer: "", experienceLevel: "Beginner" });
  const [result, setResult] = useState<CareerResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (saved?.careerProfile) {
      const cp = saved.careerProfile;
      setForm({
        degree: cp.degree || "B.Tech", department: cp.department || "",
        skills: cp.skills ?? [], interests: cp.interests ?? [],
        preferredCareer: cp.preferredCareer || "", experienceLevel: cp.experienceLevel || "Beginner",
      });
    }
  }, [saved]);

  const toggle = (field: "skills" | "interests", value: string) =>
    setForm((f) => ({ ...f, [field]: f[field].includes(value) ? f[field].filter((v) => v !== value) : [...f[field], value] }));

  const submit = async () => {
    if (!form.department || !form.preferredCareer) {
      toast("error", "Please choose department and preferred career");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/career", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setResult(j.result);
      toast("success", "Career roadmap generated and saved to your profile");
      setTimeout(() => document.getElementById("career-result")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <PageHeading title="Career Guidance" subtitle="Get a personalized roadmap: paths, skills, projects and interview prep." />

      <div className="card p-5 sm:p-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="cg-degree">Degree</label>
            <select id="cg-degree" className="input" value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })}>
              {["B.Tech", "B.E.", "B.Sc", "BCA", "M.Tech", "MCA", "MBA"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cg-dept">Department *</label>
            <select id="cg-dept" className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option value="">Select department…</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <p className="label">Skills (choose all that apply)</p>
          <div className="flex flex-wrap gap-2">
            {SKILL_POOL.map((s) => (
              <button type="button" key={s} onClick={() => toggle("skills", s)}
                className={`badge cursor-pointer transition-all ${form.skills.includes(s) ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}
                aria-pressed={form.skills.includes(s)}>+ {s}</button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="label">Interests</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_POOL.map((s) => (
              <button type="button" key={s} onClick={() => toggle("interests", s)}
                className={`badge cursor-pointer transition-all ${form.interests.includes(s) ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"}`}
                aria-pressed={form.interests.includes(s)}>+ {s}</button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="label" htmlFor="cg-career">Preferred career *</label>
            <select id="cg-career" className="input" value={form.preferredCareer} onChange={(e) => setForm({ ...form, preferredCareer: e.target.value })}>
              <option value="">Select career…</option>
              {CAREERS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cg-exp">Experience level</label>
            <select id="cg-exp" className="input" value={form.experienceLevel} onChange={(e) => setForm({ ...form, experienceLevel: e.target.value })}>
              {["Beginner", "Intermediate", "Advanced"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button className="btn-primary mt-5 w-full sm:w-auto" onClick={submit} disabled={submitting}>
          {submitting ? <><Spinner className="w-4 h-4" /> Generating roadmap…</> : "🎯 Generate my career roadmap"}
        </button>
      </div>

      {loading && <LoadingBlock />}

      {result && (
        <div id="career-result" className="mt-6 space-y-6 animate-fade-up">
          <div className="card p-5 sm:p-6 bg-gradient-to-r from-brand-700 to-indigo-600 border-0 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-100">Your trajectory</p>
            <h2 className="text-xl sm:text-2xl font-black mt-1">{result.headline}</h2>
          </div>

          <section>
            <h3 className="section-title mb-3">Career paths for you</h3>
            <div className="grid md:grid-cols-3 gap-3">
              {result.paths.map((p) => (
                <div key={p.title} className="card card-hover p-4">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h4 className="font-bold text-ink-900 text-sm">{p.title}</h4>
                    <span className={`badge shrink-0 ${p.demand === "Very High" ? "bg-emerald-100 text-emerald-700" : p.demand === "High" ? "bg-sky-100 text-sky-700" : "bg-ink-100 text-ink-600"}`}>{p.demand} demand</span>
                  </div>
                  <p className="text-xs text-ink-500 leading-relaxed">{p.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {p.skills.map((s) => <span key={s} className="badge bg-ink-100 text-ink-600">{s}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="section-title mb-3">Learning roadmap</h3>
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-brand-100" aria-hidden />
              <div className="space-y-4">
                {result.roadmap.map((r, i) => (
                  <div key={i} className="relative pl-11">
                    <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white text-sm font-black shadow-soft">{i + 1}</span>
                    <div className="card p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-ink-900 text-sm">{r.phase}</h4>
                        <span className="badge bg-ink-100 text-ink-600">{r.duration}</span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {r.items.map((item) => (
                          <li key={item} className="text-sm text-ink-600 flex gap-2"><span className="text-brand-500">▸</span>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="card p-4">
              <h4 className="font-bold text-ink-900 text-sm mb-2">📚 Skills to learn</h4>
              <ul className="space-y-1.5">{result.skillsToLearn.map((s) => <li key={s} className="text-xs text-ink-600 flex gap-1.5"><span className="text-brand-500">▸</span>{s}</li>)}</ul>
            </div>
            <div className="card p-4">
              <h4 className="font-bold text-ink-900 text-sm mb-2">🏢 Placement prep</h4>
              <ul className="space-y-1.5">{result.placementPrep.map((s) => <li key={s} className="text-xs text-ink-600 flex gap-1.5"><span className="text-brand-500">▸</span>{s}</li>)}</ul>
            </div>
            <div className="card p-4">
              <h4 className="font-bold text-ink-900 text-sm mb-2">💼 Interview prep</h4>
              <ul className="space-y-1.5">{result.interviewPrep.map((s) => <li key={s} className="text-xs text-ink-600 flex gap-1.5"><span className="text-brand-500">▸</span>{s}</li>)}</ul>
            </div>
          </div>

          <section>
            <h3 className="section-title mb-3">Recommended projects</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {result.projects.map((p, i) => (
                <div key={p} className="card p-4 flex gap-3 items-start">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold text-sm">{i + 1}</span>
                  <p className="text-sm text-ink-700 font-medium">{p}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
