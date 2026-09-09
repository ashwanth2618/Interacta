import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";
import { notify } from "@/lib/notify";
import { PRIORITIES, FEEDBACK_CATEGORIES, FEEDBACK_TYPES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "ADMIN");
    const db = getDb();
    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") ?? "").trim().toLowerCase();
    const category = sp.get("category") ?? "";
    const status = sp.get("status") ?? "";
    const type = sp.get("type") ?? "";

    let where = "1=1";
    const args: unknown[] = [];
    if (session.role === "STUDENT") { where += " AND f.student_id = ?"; args.push(session.id); }
    if (search) {
      where += " AND (lower(f.title) LIKE ? OR lower(f.description) LIKE ?)";
      args.push(`%${search}%`, `%${search}%`);
    }
    if (category) { where += " AND f.category = ?"; args.push(category); }
    if (status) { where += " AND f.status = ?"; args.push(status); }
    if (type) { where += " AND f.type = ?"; args.push(type); }

    const rows = db.prepare(`
      SELECT f.*, u.name AS student_name, u.student_id AS student_code
      FROM feedback f JOIN users u ON u.id = f.student_id
      WHERE ${where} ORDER BY f.created_at DESC LIMIT 300
    `).all(...args) as Array<Record<string, unknown>>;

    const items = rows.map((r) => {
      const anonymous = Number(r.is_anonymous) === 1;
      const isOwner = session.role === "STUDENT" && Number(r.student_id) === session.id;
      return {
        id: r.id, type: r.type, category: r.category, title: r.title,
        description: r.description, priority: r.priority, status: r.status,
        adminResponse: r.admin_response,
        isAnonymous: anonymous,
        studentName: anonymous ? (isOwner ? "You (anonymous)" : "Anonymous Student") : r.student_name,
        studentCode: anonymous ? null : r.student_code,
        createdAt: r.created_at, updatedAt: r.updated_at,
      };
    });
    return ok({ feedback: items });
  });
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const type = String(body.type ?? "");
    const category = String(body.category ?? "").trim();
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const priority = String(body.priority ?? "");
    const isAnonymous = Boolean(body.isAnonymous);

    if (!FEEDBACK_TYPES.includes(type as never)) throw new HttpError(400, "Choose a valid submission type");
    if (!FEEDBACK_CATEGORIES.includes(category as never)) throw new HttpError(400, "Choose a valid category");
    if (title.length < 5 || title.length > 120) throw new HttpError(400, "Title must be 5-120 characters");
    if (description.length < 20) throw new HttpError(400, "Please write at least 20 characters");
    if (!PRIORITIES.includes(priority as never)) throw new HttpError(400, "Choose a valid priority");

    const db = getDb();
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO feedback (student_id, type, category, title, description, priority, is_anonymous, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?)
    `).run(session.id, type, category, title, description, priority, isAnonymous ? 1 : 0, now, now);

    const admins = db.prepare("SELECT id FROM users WHERE role='ADMIN' AND status='ACTIVE'").all() as Array<{ id: number }>;
    for (const a of admins) {
      notify(a.id, "FEEDBACK", `New ${type.toLowerCase()} submitted`,
        `${isAnonymous ? "Anonymous" : session.name}: “${title.slice(0, 60)}” (${category}).`, "/admin/feedback");
    }
    notify(session.id, "FEEDBACK", "Submission received",
      `Your ${type.toLowerCase()} “${title.slice(0, 50)}” was submitted and is awaiting review.`, "/student/feedback");

    return ok({ id: Number(info.lastInsertRowid) }, { status: 201 });
  });
}
