import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, withApi, parseId } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { PRIORITIES, ISSUE_CATEGORIES } from "@/lib/constants";

function daysAgoIso(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const db = getDb();
    const sp = req.nextUrl.searchParams;

    const search = (sp.get("search") ?? "").trim().toLowerCase();
    const category = sp.get("category") ?? "";
    const priority = sp.get("priority") ?? "";
    const status = sp.get("status") ?? "";
    const mine = sp.get("mine") === "1";
    const assignedToMe = sp.get("assignedToMe") === "1";
    const limit = Math.min(Number(sp.get("limit") ?? 200), 500);

    let where = "1=1";
    const args: unknown[] = [];

    if (session.role === "STUDENT") {
      where += " AND i.student_id = ?";
      args.push(session.id);
    } else if (session.role === "STAFF") {
      where += " AND i.assigned_staff_id = ?";
      args.push(session.id);
    }
    if (mine && session.role === "ADMIN") {
      // admin "mine" not used; ignore
    }
    if (search) {
      where += " AND (lower(i.title) LIKE ? OR lower(i.description) LIKE ? OR lower(i.tracking_id) LIKE ?)";
      const like = `%${search}%`;
      args.push(like, like, like);
    }
    if (category) { where += " AND i.category = ?"; args.push(category); }
    if (priority) { where += " AND i.priority = ?"; args.push(priority); }
    if (status) { where += " AND i.status = ?"; args.push(status); }

    const rows = db.prepare(`
      SELECT i.*, u.name AS student_name, u.student_id AS student_code,
             s.name AS staff_name, s.department AS staff_department
      FROM issues i
      JOIN users u ON u.id = i.student_id
      LEFT JOIN users s ON s.id = i.assigned_staff_id
      WHERE ${where}
      ORDER BY
        CASE i.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END,
        i.created_at DESC
      LIMIT ?
    `).all(...args, limit) as Array<Record<string, unknown>>;

    const safe = rows.map((r) => {
      const anonymous = Number(r.is_anonymous) === 1;
      const showIdentity = !anonymous || session.role !== "STUDENT";
      return {
        id: r.id,
        trackingId: r.tracking_id,
        title: r.title,
        category: r.category,
        priority: r.priority,
        status: r.status,
        isAnonymous: anonymous,
        studentName: anonymous ? (session.role === "STUDENT" && Number(r.student_id) === session.id ? "You (anonymous)" : "Anonymous Student") : r.student_name,
        studentCode: anonymous ? null : r.student_code,
        assignedStaffId: r.assigned_staff_id,
        staffName: r.staff_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        responseCount: (db.prepare("SELECT COUNT(*) c FROM issue_responses WHERE issue_id=?").get(r.id) as { c: number }).c,
      };
    });

    return ok({ issues: safe });
  });
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const category = String(body.category ?? "").trim();
    const priority = String(body.priority ?? "").trim();
    const isAnonymous = Boolean(body.isAnonymous);
    const attachmentName = body.attachmentName ? String(body.attachmentName).slice(0, 200) : null;

    if (title.length < 5 || title.length > 120) throw new HttpError(400, "Title must be 5-120 characters");
    if (description.length < 20) throw new HttpError(400, "Please describe the issue in at least 20 characters");
    if (!ISSUE_CATEGORIES.includes(category as never)) throw new HttpError(400, "Please choose a valid category");
    if (!PRIORITIES.includes(priority as never)) throw new HttpError(400, "Please choose a valid priority");

    const db = getDb();
    const now = new Date().toISOString();

    // unique tracking id
    const trackingId = db.transaction(() => {
      let id = "";
      let tries = 0;
      do {
        const maxRow = db.prepare("SELECT MAX(CAST(SUBSTR(tracking_id, 5) AS INTEGER)) AS m FROM issues").get() as { m: number | null };
        const next = (maxRow.m ?? 1000) + 1;
        id = `INT-${next}`;
        tries++;
      } while (db.prepare("SELECT 1 FROM issues WHERE tracking_id=?").get(id) && tries < 5);
      return id;
    })();

    const info = db.prepare(`
      INSERT INTO issues (tracking_id, student_id, title, description, category, priority,
        is_anonymous, status, attachment_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?)
    `).run(trackingId, session.id, title, description, category, priority, isAnonymous ? 1 : 0, attachmentName, now, now);

    const admins = db.prepare("SELECT id FROM users WHERE role='ADMIN' AND status='ACTIVE'").all() as Array<{ id: number }>;
    for (const a of admins) {
      notify(a.id, "ISSUE", "New issue submitted",
        `${trackingId} “${title.slice(0, 60)}” needs review${isAnonymous ? " (anonymous)" : ""}.`,
        "/admin/issues");
    }
    notify(session.id, "ISSUE", `Issue ${trackingId} submitted`,
      `We received your issue “${title.slice(0, 60)}”. Track its progress on My Issues.`,
      "/student/issues");

    return ok({ id: Number(info.lastInsertRowid), trackingId }, { status: 201 });
  });
}
