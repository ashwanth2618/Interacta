import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole, HttpError } from "@/lib/auth";
import { ok, withApi, parseId } from "@/lib/api";
import { notify } from "@/lib/notify";
import { ISSUE_STATUSES } from "@/lib/constants";

async function loadIssue(id: number) {
  const db = getDb();
  const issue = db.prepare(`
    SELECT i.*, u.name AS student_name, u.student_id AS student_code, u.email AS student_email,
           s.name AS staff_name, s.email AS staff_email
    FROM issues i
    JOIN users u ON u.id = i.student_id
    LEFT JOIN users s ON s.id = i.assigned_staff_id
    WHERE i.id = ?
  `).get(id) as Record<string, unknown> | undefined;
  if (!issue) throw new HttpError(404, "Issue not found");
  return issue;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const id = parseId(params.id);
    const db = getDb();
    const issue = await loadIssue(id);

    if (session.role === "STUDENT" && Number(issue.student_id) !== session.id) {
      throw new HttpError(403, "You can only view your own issues");
    }
    if (session.role === "STAFF" && Number(issue.assigned_staff_id) !== session.id) {
      throw new HttpError(403, "This issue is not assigned to you");
    }

    const anonymous = Number(issue.is_anonymous) === 1;
    const isOwner = session.role === "STUDENT" && Number(issue.student_id) === session.id;
    const showIdentity = !anonymous || isOwner;

    const responses = (db.prepare(`
      SELECT r.*, u.name AS responder_name, u.role AS responder_role
      FROM issue_responses r JOIN users u ON u.id = r.responder_id
      WHERE r.issue_id = ? ORDER BY r.created_at ASC
    `).all(id) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id,
      message: r.message,
      responderRole: r.responder_role,
      responderName: anonymous && r.responder_role === "STUDENT" && !isOwner ? "Anonymous Student" : r.responder_name,
      createdAt: r.created_at,
    }));

    const timeline: Array<{ kind: string; at: string; label: string }> = [
      { kind: "created", at: String(issue.created_at), label: "Issue submitted" },
      ...responses.map((r) => ({ kind: "response", at: String(r.createdAt), label: r.responderRole === "ADMIN" ? "Admin responded" : "Staff responded" })),
      ...(issue.assigned_staff_id ? [{ kind: "assigned", at: String(issue.updated_at), label: `Assigned to ${anonymous && !isOwner ? "staff" : issue.staff_name}` }] : []),
      ...(issue.status === "RESOLVED" || issue.status === "CLOSED" ? [{ kind: "status", at: String(issue.updated_at), label: `Status: ${issue.status}` }] : []),
    ].sort((a, b) => a.at.localeCompare(b.at));

    return ok({
      issue: {
        id: issue.id,
        trackingId: issue.tracking_id,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        priority: issue.priority,
        status: issue.status,
        isAnonymous: anonymous,
        attachmentName: issue.attachment_name,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        studentName: showIdentity ? issue.student_name : "Anonymous Student",
        studentCode: showIdentity ? issue.student_code : null,
        assignedStaffId: issue.assigned_staff_id,
        staffName: issue.staff_name,
      },
      responses,
      timeline,
    });
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withApi(async () => {
    const session = await requireRole("ADMIN", "STAFF");
    const id = parseId(params.id);
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const db = getDb();
    const issue = await loadIssue(id);

    const action = String(body.action ?? "");
    const now = new Date().toISOString();

    if (action === "respond") {
      const message = String(body.message ?? "").trim();
      if (message.length < 5) throw new HttpError(400, "Response must be at least 5 characters");
      if (session.role === "STAFF" && Number(issue.assigned_staff_id) !== session.id) {
        throw new HttpError(403, "This issue is not assigned to you");
      }
      db.prepare(`INSERT INTO issue_responses (issue_id, responder_id, responder_role, message, is_internal, created_at)
        VALUES (?, ?, ?, ?, 0, ?)`).run(id, session.id, session.role, message, now);

      // auto status: any response moves the issue forward to IN PROGRESS
      const nextStatus = ["SUBMITTED", "UNDER REVIEW", "ASSIGNED"].includes(issue.status as string) ? "IN PROGRESS" : issue.status;
      db.prepare("UPDATE issues SET status=?, updated_at=? WHERE id=?").run(nextStatus, now, id);

      if (nextStatus !== issue.status) {
        notify(Number(issue.student_id), "STATUS", `Issue ${issue.tracking_id} update`,
          `Status moved to ${nextStatus}. A response was posted.`, "/student/issues");
      }
      notify(Number(issue.student_id), "ISSUE", `Response on ${issue.tracking_id}`,
        `${session.role === "ADMIN" ? "The admin office" : "Staff"} responded to “${String(issue.title).slice(0, 50)}”.`,
        "/student/issues");
      return ok({ success: true, status: nextStatus });
    }

    if (action === "assign") {
      if (session.role !== "ADMIN") throw new HttpError(403, "Only admins can assign issues");
      const staffId = Number(body.staffId);
      if (!Number.isFinite(staffId) || staffId <= 0) throw new HttpError(400, "Choose a staff member");
      const staff = db.prepare("SELECT id, name FROM users WHERE id=? AND role IN ('STAFF','ADMIN') AND status='ACTIVE'").get(staffId) as { id: number; name: string } | undefined;
      if (!staff) throw new HttpError(404, "Staff member not found or inactive");

      db.prepare("UPDATE issues SET assigned_staff_id=?, status=?, updated_at=? WHERE id=?")
        .run(staffId, "ASSIGNED", now, id);

      notify(staffId, "ASSIGNMENT", `Issue assigned to you`,
        `${issue.tracking_id} “${String(issue.title).slice(0, 50)}” (${issue.priority}).`, "/staff/issues");
      notify(Number(issue.student_id), "STATUS", `Issue ${issue.tracking_id} assigned`,
        `Your issue is now with ${staff.name}. Status: ASSIGNED.`, "/student/issues");
      return ok({ success: true });
    }

    if (action === "status") {
      const status = String(body.status ?? "");
      if (!ISSUE_STATUSES.includes(status as never)) throw new HttpError(400, "Invalid status");
      if (session.role === "STAFF") {
        if (Number(issue.assigned_staff_id) !== session.id) throw new HttpError(403, "This issue is not assigned to you");
        if (!["IN PROGRESS", "RESOLVED"].includes(status)) throw new HttpError(403, "Staff can set IN PROGRESS or RESOLVED");
      }
      db.prepare("UPDATE issues SET status=?, updated_at=? WHERE id=?").run(status, now, id);
      notify(Number(issue.student_id), "STATUS", `Issue ${issue.tracking_id} ${status.toLowerCase()}`,
        `Your issue “${String(issue.title).slice(0, 50)}” is now ${status}.`, "/student/issues");
      return ok({ success: true });
    }

    throw new HttpError(400, "Unknown action");
  });
}
