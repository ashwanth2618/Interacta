import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi, parseId } from "@/lib/api";
import { notifyMany, allStudents, allActiveStaff } from "@/lib/notify";
import { PRIORITIES, ANNOUNCEMENT_CATEGORIES } from "@/lib/constants";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    await requireRole("STUDENT", "STAFF", "ADMIN");
    const db = getDb();
    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") ?? "").trim().toLowerCase();
    const category = sp.get("category") ?? "";
    const includeAll = sp.get("all") === "1"; // admin view includes drafts/archived

    let where = includeAll ? "1=1" : "a.status='PUBLISHED'";
    const args: unknown[] = [];
    if (search) {
      where += " AND (lower(a.title) LIKE ? OR lower(a.body) LIKE ?)";
      args.push(`%${search}%`, `%${search}%`);
    }
    if (category) { where += " AND a.category = ?"; args.push(category); }

    const rows = db.prepare(`
      SELECT a.*, u.name AS author_name, u.role AS author_role
      FROM announcements a JOIN users u ON u.id = a.author_id
      WHERE ${where}
      ORDER BY CASE a.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
        a.created_at DESC
      LIMIT 200
    `).all(...args) as Array<Record<string, unknown>>;

    return ok({
      announcements: rows.map((r) => ({
        id: r.id, title: r.title, body: r.body, category: r.category,
        priority: r.priority, status: r.status,
        authorName: r.author_name, authorRole: r.author_role,
        expiryDate: r.expiry_date, attachmentName: r.attachment_name,
        createdAt: r.created_at,
      })),
    });
  });
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("ADMIN", "STAFF");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const title = String(body.title ?? "").trim();
    const text = String(body.body ?? "").trim();
    const category = String(body.category ?? "").trim();
    const priority = String(body.priority ?? "MEDIUM");
    const expiryDate = body.expiryDate ? String(body.expiryDate) : null;
    const attachmentName = body.attachmentName ? String(body.attachmentName).slice(0, 200) : null;

    if (title.length < 5 || title.length > 150) throw new HttpError(400, "Title must be 5-150 characters");
    if (text.length < 20) throw new HttpError(400, "Announcement body must be at least 20 characters");
    if (!ANNOUNCEMENT_CATEGORIES.includes(category as never)) throw new HttpError(400, "Choose a valid category");
    if (!PRIORITIES.includes(priority as never)) throw new HttpError(400, "Choose a valid priority");

    const db = getDb();
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO announcements (author_id, title, body, category, priority, expiry_date, attachment_name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', ?, ?)
    `).run(session.id, title, text, category, priority, expiryDate, attachmentName, now, now);

    // notify every student + staff member about the new announcement
    notifyMany(
      [...allStudents(), ...allActiveStaff()].map((u) => u.id).filter((id) => id !== session.id),
      "ANNOUNCEMENT", "New announcement",
      `${title.slice(0, 70)}`, "/student/announcements"
    );

    return ok({ id: Number(info.lastInsertRowid) }, { status: 201 });
  });
}
