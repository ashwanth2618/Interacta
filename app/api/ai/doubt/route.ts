import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";
import { solveDoubt, aiProviderName, detectSubject } from "@/lib/ai";
import { logLearningActivity } from "@/lib/notify";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const question = String(body.question ?? "").trim();
    if (question.length < 5) throw new HttpError(400, "Please enter a question (at least 5 characters)");
    if (question.length > 500) throw new HttpError(400, "Question too long (max 500 characters)");

    const result = await solveDoubt(question);

    const db = getDb();
    const now = new Date().toISOString();
    const info = db.prepare("INSERT INTO ai_conversations (user_id, mode, title, created_at) VALUES (?, 'DOUBT', ?, ?)")
      .run(session.id, question.slice(0, 60), now);
    db.prepare("INSERT INTO ai_messages (conversation_id, role, content, created_at) VALUES (?, 'user', ?, ?)")
      .run(Number(info.lastInsertRowid), question, now);
    db.prepare("INSERT INTO ai_messages (conversation_id, role, content, created_at) VALUES (?, 'assistant', ?, ?)")
      .run(Number(info.lastInsertRowid), JSON.stringify(result), now);

    logLearningActivity(session.id, question.slice(0, 80), "DOUBT", detectSubject(question));

    return ok({ result, provider: aiProviderName() });
  });
}

export async function GET() {
  return withApi(async () => {
    const session = await requireRole("STUDENT");
    const db = getDb();
    const rows = db.prepare(`
      SELECT m.content, m.created_at, c.title FROM ai_messages m
      JOIN ai_conversations c ON c.id = m.conversation_id
      WHERE c.user_id=? AND c.mode='DOUBT' ORDER BY m.id DESC LIMIT 10
    `).all(session.id) as Array<{ content: string; created_at: string; title: string }>;
    const history = rows
      .filter((r) => {
        try { JSON.parse(r.content); return false; } catch { return true; }
      })
      .slice(0, 8)
      .map((r) => ({ question: r.content, at: r.created_at }));
    return ok({ history: history.reverse() });
  });
}
