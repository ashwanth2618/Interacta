import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { signSession } from "@/lib/jwt";
import { toSessionUser, HttpError } from "@/lib/auth";
import { ok, fail, withApi } from "@/lib/api";
import { notify } from "@/lib/notify";

const AVATAR_COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const department = String(body.department ?? "").trim();
    const studentId = String(body.studentId ?? "").trim();
    const year = String(body.year ?? "").trim();
    const course = String(body.course ?? "").trim();

    if (name.length < 2 || name.length > 80) throw new HttpError(400, "Please enter your full name (2-80 characters)");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Please enter a valid email address");
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");
    if (!department) throw new HttpError(400, "Department is required");
    if (!studentId) throw new HttpError(400, "Student ID is required");

    const db = getDb();
    if (db.prepare("SELECT id FROM users WHERE lower(email)=?").get(email)) {
      return fail(409, "An account with this email already exists. Try logging in instead.");
    }
    if (db.prepare("SELECT id FROM users WHERE student_id=?").get(studentId)) {
      return fail(409, "This Student ID is already registered. Contact the admin office if this is a mistake.");
    }

    const hash = bcrypt.hashSync(password, 10);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const info = db.prepare(`
      INSERT INTO users (name, email, password_hash, role, status, department, avatar_color,
        student_id, year, course, created_at)
      VALUES (?, ?, ?, 'STUDENT', 'ACTIVE', ?, ?, ?, ?, ?, ?)
    `).run(name, email, hash, department, color, studentId, year || null, course || null, new Date().toISOString());

    const row = db.prepare("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid) as never;
    const session = toSessionUser(row);
    const token = await signSession(session);

    notify(Number(info.lastInsertRowid), "ISSUE",
      "Welcome to INTERACTA!",
      "Your account is ready. Raise issues, give feedback, and explore the AI assistant.",
      "/student");

    const res = ok({ user: session }, { status: 201 });
    res.cookies.set("interacta_session", token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  });
}
