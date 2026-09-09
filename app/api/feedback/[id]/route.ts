import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi, parseId } from "@/lib/api";
import { notify } from "@/lib/notify";
import { FEEDBACK_STATUSES } from "@/lib/constants";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("ADMIN");
    const id = parseId(params.id);
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");
    const db = getDb();

    const fb = db.prepare("SELECT * FROM feedback WHERE id=?").get(id) as Record<string, unknown> | undefined;
    if (!fb) throw new HttpError(404, "Feedback not found");

    const action = String(body.action ?? "");
    const now = new Date().toISOString();

    if (action === "respond") {
      const message = String(body.message ?? "").trim();
      if (message.length < 5) throw new HttpError(400, "Response must be at least 5 characters");
      const nextStatus = body.markResolved === false ? "UNDER REVIEW" : "RESOLVED";
      db.prepare("UPDATE feedback SET admin_response=?, status=?, updated_at=? WHERE id=?")
        .run(message, nextStatus, now, id);
      notify(Number(fb.student_id), "FEEDBACK", "Response to your feedback",
        `The admin office responded to “${String(fb.title).slice(0, 50)}”.`, "/student/feedback");
      return ok({ success: true, status: nextStatus });
    }

    if (action === "status") {
      const status = String(body.status ?? "");
      if (!FEEDBACK_STATUSES.includes(status as never)) throw new HttpError(400, "Invalid status");
      db.prepare("UPDATE feedback SET status=?, updated_at=? WHERE id=?").run(status, now, id);
      notify(Number(fb.student_id), "FEEDBACK", `Feedback ${status.toLowerCase()}`,
        `Your submission “${String(fb.title).slice(0, 50)}” is now ${status}.`, "/student/feedback");
      return ok({ success: true });
    }

    throw new HttpError(400, "Unknown action");
  });
}
