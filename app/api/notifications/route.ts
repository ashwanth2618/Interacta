import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";

export async function GET() {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const db = getDb();
    const rows = db.prepare(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50"
    ).all(session.id) as Array<Record<string, unknown>>;
    const unread = (db.prepare("SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0").get(session.id) as { c: number }).c;
    return ok({
      notifications: rows.map((r) => ({
        id: r.id, type: r.type, title: r.title, body: r.body,
        link: r.link, read: Number(r.read) === 1, createdAt: r.created_at,
      })),
      unread,
    });
  });
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const body = await req.json().catch(() => ({}));
    const db = getDb();
    if (body.action === "markAll") {
      db.prepare("UPDATE notifications SET read=1 WHERE user_id=?").run(session.id);
      return ok({ success: true });
    }
    if (body.action === "markRead" && body.id) {
      db.prepare("UPDATE notifications SET read=1 WHERE id=? AND user_id=?").run(Number(body.id), session.id);
      return ok({ success: true });
    }
    throw new HttpError(400, "Unknown action");
  });
}
