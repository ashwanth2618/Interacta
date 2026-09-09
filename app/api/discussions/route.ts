import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi, parseId } from "@/lib/api";
import { notify } from "@/lib/notify";
import { DISCUSSION_CATEGORIES } from "@/lib/constants";
import { logLearningActivity } from "@/lib/notify";

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const db = getDb();
    const sp = req.nextUrl.searchParams;
    const search = (sp.get("search") ?? "").trim().toLowerCase();
    const category = sp.get("category") ?? "";
    const sort = sp.get("sort") ?? "recent";
    const mine = sp.get("mine") === "1";

    let where = "d.status='VISIBLE'";
    const args: unknown[] = [];
    if (mine) { where += " AND d.author_id = ?"; args.push(session.id); }
    if (search) {
      where += " AND (lower(d.title) LIKE ? OR lower(d.body) LIKE ?)";
      args.push(`%${search}%`, `%${search}%`);
    }
    if (category) { where += " AND d.category = ?"; args.push(category); }

    const order = sort === "trending"
      ? "views DESC, json_array_length(d.likes) DESC, d.created_at DESC"
      : "d.created_at DESC";

    const rows = db.prepare(`
      SELECT d.*, u.name AS author_name, u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.discussion_id = d.id) AS comment_count
      FROM discussions d JOIN users u ON u.id = d.author_id
      WHERE ${where} ORDER BY ${order} LIMIT 100
    `).all(...args) as Array<Record<string, unknown>>;

    const posts = rows.map((r) => {
      const anonymous = Number(r.is_anonymous) === 1;
      return {
        id: r.id, title: r.title, body: r.body, category: r.category,
        isAnonymous: anonymous,
        authorName: anonymous ? "Anonymous Student" : r.author_name,
        authorRole: anonymous ? "STUDENT" : r.author_role,
        likes: JSON.parse(String(r.likes ?? "[]")) as number[],
        commentCount: r.comment_count, views: r.views,
        createdAt: r.created_at,
      };
    });
    return ok({ posts });
  });
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const title = String(body.title ?? "").trim();
    const bodyText = String(body.body ?? "").trim();
    const category = String(body.category ?? "").trim();
    const isAnonymous = Boolean(body.isAnonymous);

    if (title.length < 5 || title.length > 150) throw new HttpError(400, "Title must be 5-150 characters");
    if (bodyText.length < 10) throw new HttpError(400, "Post body must be at least 10 characters");
    if (!DISCUSSION_CATEGORIES.includes(category as never)) throw new HttpError(400, "Choose a valid category");

    const db = getDb();
    const info = db.prepare(`
      INSERT INTO discussions (author_id, title, body, category, is_anonymous, likes, status, views, created_at)
      VALUES (?, ?, ?, ?, ?, '[]', 'VISIBLE', 0, ?)
    `).run(session.id, title, bodyText, category, isAnonymous ? 1 : 0, new Date().toISOString());

    return ok({ id: Number(info.lastInsertRowid) }, { status: 201 });
  });
}

