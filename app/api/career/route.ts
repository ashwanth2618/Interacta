import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";
import { careerGuidance } from "@/lib/ai";

export async function GET() {
  return withApi(async () => {
    const session = await requireRole("STUDENT");
    const db = getDb();
    const cp = db.prepare("SELECT * FROM career_profiles WHERE user_id=?").get(session.id) as Record<string, unknown> | undefined;
    return ok({
      careerProfile: cp
        ? {
            degree: cp.degree, department: cp.department,
            skills: JSON.parse(String(cp.skills ?? "[]")),
            interests: JSON.parse(String(cp.interests ?? "[]")),
            preferredCareer: cp.preferred_career, experienceLevel: cp.experience_level,
          }
        : null,
    });
  });
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const degree = String(body.degree ?? "").trim();
    const department = String(body.department ?? "").trim();
    const skills = Array.isArray(body.skills) ? body.skills.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 15) : [];
    const interests = Array.isArray(body.interests) ? body.interests.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 15) : [];
    const preferredCareer = String(body.preferredCareer ?? "").trim();
    const experienceLevel = String(body.experienceLevel ?? "Beginner");

    if (!degree) throw new HttpError(400, "Degree is required");
    if (!department) throw new HttpError(400, "Department is required");
    if (!preferredCareer) throw new HttpError(400, "Preferred career is required");

    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO career_profiles (user_id, degree, department, skills, interests, preferred_career, experience_level, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        degree=excluded.degree, department=excluded.department, skills=excluded.skills,
        interests=excluded.interests, preferred_career=excluded.preferred_career,
        experience_level=excluded.experience_level, updated_at=excluded.updated_at
    `).run(session.id, degree, department, JSON.stringify(skills), JSON.stringify(interests), preferredCareer, experienceLevel, now);

    const result = careerGuidance({ degree, department, skills, interests, preferredCareer, experienceLevel });
    return ok({ result });
  });
}
