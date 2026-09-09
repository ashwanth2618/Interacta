import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";

export async function GET() {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const db = getDb();
    const u = db.prepare("SELECT * FROM users WHERE id=?").get(session.id) as Record<string, unknown> | undefined;
    if (!u) throw new HttpError(404, "User not found");
    return ok({
      profile: {
        id: u.id, name: u.name, email: u.email, role: u.role,
        department: u.department, studentId: u.student_id, year: u.year, course: u.course,
        designation: u.designation, employeeId: u.employee_id,
        skills: JSON.parse(String(u.skills ?? "[]")),
        interests: JSON.parse(String(u.interests ?? "[]")),
        careerPreference: u.career_preference,
        createdAt: u.created_at,
      },
    });
  });
}

export async function PATCH(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");
    const db = getDb();

    const name = String(body.name ?? "").trim();
    if (name.length < 2 || name.length > 80) throw new HttpError(400, "Name must be 2-80 characters");
    const skills = Array.isArray(body.skills) ? body.skills.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 15) : [];
    const interests = Array.isArray(body.interests) ? body.interests.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 15) : [];
    const careerPreference = body.careerPreference ? String(body.careerPreference).trim().slice(0, 80) : null;
    const year = body.year ? String(body.year).trim().slice(0, 20) : null;
    const course = body.course ? String(body.course).trim().slice(0, 80) : null;
    const department = body.department ? String(body.department).trim().slice(0, 80) : null;

    db.prepare("UPDATE users SET name=?, skills=?, interests=?, career_preference=?, year=COALESCE(?, year), course=COALESCE(?, course), department=COALESCE(?, department) WHERE id=?")
      .run(name, JSON.stringify(skills), JSON.stringify(interests), careerPreference, year, course, department, session.id);

    // keep career profile in sync for recommendation engines
    db.prepare(`
      INSERT INTO career_profiles (user_id, degree, department, skills, interests, preferred_career, experience_level, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        degree=excluded.degree, department=excluded.department, skills=excluded.skills,
        interests=excluded.interests, preferred_career=excluded.preferred_career, updated_at=excluded.updated_at
    `).run(
      session.id, course ?? "B.Tech", department ?? session.department ?? "",
      JSON.stringify(skills), JSON.stringify(interests), careerPreference, "Beginner",
      new Date().toISOString()
    );

    return ok({ success: true });
  });
}
