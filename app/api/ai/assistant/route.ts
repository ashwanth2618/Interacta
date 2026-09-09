import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";
import { assistantReply, aiProviderName, type ChatTurn } from "@/lib/ai";
import { logLearningActivity } from "@/lib/notify";
import { detectSubject } from "@/lib/ai";

export const maxDuration = 60;

export async function GET() {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const db = getDb();
    const conv = db.prepare(
      "SELECT * FROM ai_conversations WHERE user_id=? AND mode='ASSISTANT' ORDER BY created_at DESC LIMIT 1"
    ).get(session.id) as { id: number } | undefined;
    if (!conv) return ok({ messages: [], provider: aiProviderName() });
    const msgs = db.prepare("SELECT role, content, created_at FROM ai_messages WHERE conversation_id=? ORDER BY id ASC").all(conv.id) as Array<{ role: "user" | "assistant"; content: string; created_at: string }>;
    return ok({ messages: msgs, provider: aiProviderName() });
  });
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const message = String(body.message ?? "").trim();
    if (message.length < 2) throw new HttpError(400, "Please type a question");
    if (message.length > 1000) throw new HttpError(400, "Message too long (max 1000 characters)");

    const db = getDb();
    const now = new Date().toISOString();

    let conv = db.prepare(
      "SELECT * FROM ai_conversations WHERE user_id=? AND mode='ASSISTANT' ORDER BY created_at DESC LIMIT 1"
    ).get(session.id) as { id: number } | undefined;
    if (!conv) {
      const info = db.prepare("INSERT INTO ai_conversations (user_id, mode, title, created_at) VALUES (?, 'ASSISTANT', ?, ?)")
        .run(session.id, message.slice(0, 60), now);
      conv = { id: Number(info.lastInsertRowid) };
    }

    const prior = db.prepare("SELECT role, content FROM ai_messages WHERE conversation_id=? ORDER BY id ASC LIMIT 12").all(conv.id) as ChatTurn[];

    const reply = await assistantReply([...prior, { role: "user", content: message }]);

    db.prepare("INSERT INTO ai_messages (conversation_id, role, content, created_at) VALUES (?, 'user', ?, ?)").run(conv.id, message, now);
    db.prepare("INSERT INTO ai_messages (conversation_id, role, content, created_at) VALUES (?, 'assistant', ?, ?)").run(conv.id, reply, now);

    if (session.role === "STUDENT") {
      logLearningActivity(session.id, message.slice(0, 80), "ASSISTANT", detectSubject(message));
    }

    return ok({ reply, provider: aiProviderName() });
  });
}

export async function DELETE() {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const db = getDb();
    const convs = db.prepare("SELECT id FROM ai_conversations WHERE user_id=? AND mode='ASSISTANT'").all(session.id) as Array<{ id: number }>;
    for (const c of convs) {
      db.prepare("DELETE FROM ai_messages WHERE conversation_id=?").run(c.id);
      db.prepare("DELETE FROM ai_conversations WHERE id=?").run(c.id);
    }
    return ok({ success: true });
  });
}
