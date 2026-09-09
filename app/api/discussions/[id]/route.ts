import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi, parseId } from "@/lib/api";
import { notify, logLearningActivity } from "@/lib/notify";

async function loadPost(id: number) {
  const db = getDb();
  const post = db.prepare(`
    SELECT d.*, u.name AS author_name, u.role AS author_role
    FROM discussions d JOIN users u ON u.id = d.author_id WHERE d.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!post) throw new HttpError(404, "Discussion not found");
  return post;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const id = parseId(params.id);
    const db = getDb();
    const post = await loadPost(id);

    db.prepare("UPDATE discussions SET views = views + 1 WHERE id=?").run(id);

    const anonymous = Number(post.is_anonymous) === 1;
    const isOwner = Number(post.author_id) === session.id;

    const comments = (db.prepare(`
      SELECT c.*, u.name AS author_name, u.role AS author_role
      FROM comments c JOIN users u ON u.id = c.author_id
      WHERE c.discussion_id = ? ORDER BY c.created_at ASC
    `).all(id) as Array<Record<string, unknown>>).map((c) => {
      const cAnon = Number(c.is_anonymous) === 1;
      const cOwner = Number(c.author_id) === session.id;
      return {
        id: c.id, body: c.body,
        isAnonymous: cAnon,
        authorName: cAnon && !cOwner ? "Anonymous Student" : (c.author_name as string),
        authorRole: cAnon && !cOwner ? "STUDENT" : c.author_role,
        createdAt: c.created_at,
      };
    });

    return ok({
      post: {
        id: post.id, title: post.title, body: post.body, category: post.category,
        isAnonymous: anonymous,
        authorName: anonymous && !isOwner ? "Anonymous Student" : post.author_name,
        authorRole: anonymous && !isOwner ? "STUDENT" : post.author_role,
        likes: JSON.parse(String(post.likes ?? "[]")) as number[],
        views: (post.views as number) + 1,
        status: post.status,
        createdAt: post.created_at,
      },
      comments,
    });
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const id = parseId(params.id);
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");
    const db = getDb();
    const post = await loadPost(id);
    const action = String(body.action ?? "");

    if (action === "comment") {
      const text = String(body.body ?? "").trim();
      if (text.length < 2) throw new HttpError(400, "Comment must be at least 2 characters");
      const isAnon = Boolean(body.isAnonymous);
      db.prepare("INSERT INTO comments (discussion_id, author_id, body, is_anonymous, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(id, session.id, text, isAnon ? 1 : 0, new Date().toISOString());

      // notify post author (unless they commented on their own post)
      if (Number(post.author_id) !== session.id) {
        notify(Number(post.author_id), "DISCUSSION", "New reply to your post",
          `${isAnon ? "Someone" : session.name} replied to “${String(post.title).slice(0, 50)}”.`,
          `/student/discussions/${id}`);
      }
      // notify other commenters (thread participants), skip author + self
      const others = db.prepare("SELECT DISTINCT author_id FROM comments WHERE discussion_id=? AND author_id != ? AND author_id != ?")
        .all(id, post.author_id, session.id) as Array<{ author_id: number }>;
      for (const o of others) {
        notify(o.author_id, "DISCUSSION", "New reply in a discussion you follow",
          `“${String(post.title).slice(0, 50)}” has a new reply.`, `/student/discussions/${id}`);
      }
      if (session.role === "STUDENT") {
        logLearningActivity(session.id, String(post.title).slice(0, 80), "DISCUSSION", post.category as string);
      }
      return ok({ success: true }, { status: 201 });
    }

    if (action === "like") {
      const likes = JSON.parse(String(post.likes ?? "[]")) as number[];
      const has = likes.includes(session.id);
      const next = has ? likes.filter((l) => l !== session.id) : [...likes, session.id];
      db.prepare("UPDATE discussions SET likes=? WHERE id=?").run(JSON.stringify(next), id);
      return ok({ likes: next });
    }

    if (action === "report") {
      const reason = String(body.reason ?? "").trim() || "Inappropriate content";
      db.prepare("INSERT INTO reports (reporter_id, discussion_id, comment_id, reason, status, created_at) VALUES (?, ?, NULL, ?, 'OPEN', ?)")
        .run(session.id, id, reason.slice(0, 300), new Date().toISOString());
      const admins = db.prepare("SELECT id FROM users WHERE role='ADMIN'").all() as Array<{ id: number }>;
      for (const a of admins) {
        notify(a.id, "DISCUSSION", "Content reported",
          `A post was reported: “${String(post.title).slice(0, 50)}” — reason: ${reason.slice(0, 80)}`, "/admin/discussions");
      }
      return ok({ success: true });
    }

    if (action === "moderate") {
      if (session.role !== "ADMIN") throw new HttpError(403, "Only admins can moderate");
      const op = String(body.op ?? "");
      if (op === "hide") db.prepare("UPDATE discussions SET status='HIDDEN' WHERE id=?").run(id);
      else if (op === "unhide") db.prepare("UPDATE discussions SET status='VISIBLE' WHERE id=?").run(id);
      else if (op === "delete") {
        db.prepare("DELETE FROM comments WHERE discussion_id=?").run(id);
        db.prepare("DELETE FROM discussions WHERE id=?").run(id);
      } else throw new HttpError(400, "Unknown moderation op");
      return ok({ success: true });
    }

    throw new HttpError(400, "Unknown action");
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("ADMIN");
    const id = parseId(params.id);
    const db = getDb();
    const post = await loadPost(id);
    db.prepare("DELETE FROM comments WHERE discussion_id=?").run(id);
    db.prepare("DELETE FROM discussions WHERE id=?").run(id);
    return ok({ success: true });
  });
}
