import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi, parseId } from "@/lib/api";
import { PRIORITIES, ANNOUNCEMENT_CATEGORIES } from "@/lib/constants";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("ADMIN", "STAFF");
    const id = parseId(params.id);
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");
    const db = getDb();

    const ann = db.prepare("SELECT * FROM announcements WHERE id=?").get(id) as Record<string, unknown> | undefined;
    if (!ann) throw new HttpError(404, "Announcement not found");
    if (session.role === "STAFF" && Number(ann.author_id) !== session.id) {
      throw new HttpError(403, "You can only edit your own announcements");
    }

    const now = new Date().toISOString();

    if (body.action === "status") {
      const status = String(body.status ?? "");
      if (!["PUBLISHED", "DRAFT", "ARCHIVED"].includes(status)) throw new HttpError(400, "Invalid status");
      db.prepare("UPDATE announcements SET status=?, updated_at=? WHERE id=?").run(status, now, id);
      return ok({ success: true });
    }

    const title = String(body.title ?? ann.title).trim();
    const text = String(body.body ?? ann.body).trim();
    const category = String(body.category ?? ann.category).trim();
    const priority = String(body.priority ?? ann.priority);
    const expiryDate = body.expiryDate !== undefined ? (body.expiryDate ? String(body.expiryDate) : null) : ann.expiry_date;

    if (title.length < 5 || title.length > 150) throw new HttpError(400, "Title must be 5-150 characters");
    if (text.length < 20) throw new HttpError(400, "Announcement body must be at least 20 characters");
    if (!ANNOUNCEMENT_CATEGORIES.includes(category as never)) throw new HttpError(400, "Choose a valid category");
    if (!PRIORITIES.includes(priority as never)) throw new HttpError(400, "Choose a valid priority");

    db.prepare(`
      UPDATE announcements SET title=?, body=?, category=?, priority=?, expiry_date=?, updated_at=? WHERE id=?
    `).run(title, text, category, priority, expiryDate, now, id);
    return ok({ success: true });
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("ADMIN", "STAFF");
    const id = parseId(params.id);
    const db = getDb();
    const ann = db.prepare("SELECT * FROM announcements WHERE id=?").get(id) as Record<string, unknown> | undefined;
    if (!ann) throw new HttpError(404, "Announcement not found");
    if (session.role === "STAFF" && Number(ann.author_id) !== session.id) {
      throw new HttpError(403, "You can only delete your own announcements");
    }
    db.prepare("DELETE FROM announcements WHERE id=?").run(id);
    return ok({ success: true });
  });
}
