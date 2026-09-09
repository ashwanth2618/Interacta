import { requireRole } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";
import { getDb } from "@/lib/db";
import { computeInsights } from "@/lib/insights";

export async function GET() {
  return withApi(async () => {
    const session = await requireRole("STUDENT", "STAFF", "ADMIN");
    const db = getDb();
    const now = new Date().toISOString();

    if (session.role === "STUDENT") {
      const myIssues = (db.prepare("SELECT COUNT(*) c FROM issues WHERE student_id=?").get(session.id) as { c: number }).c;
      const activeIssues = (db.prepare("SELECT COUNT(*) c FROM issues WHERE student_id=? AND status NOT IN ('RESOLVED','CLOSED')").get(session.id) as { c: number }).c;
      const resolved = (db.prepare("SELECT COUNT(*) c FROM issues WHERE student_id=? AND status IN ('RESOLVED','CLOSED')").get(session.id) as { c: number }).c;
      const feedback = (db.prepare("SELECT COUNT(*) c FROM feedback WHERE student_id=?").get(session.id) as { c: number }).c;
      const unread = (db.prepare("SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0").get(session.id) as { c: number }).c;
      const doubts = (db.prepare("SELECT COUNT(*) c FROM learning_activities WHERE user_id=?").get(session.id) as { c: number }).c;

      const announcements = db.prepare(`
        SELECT a.id, a.title, a.category, a.priority, a.created_at FROM announcements a
        WHERE a.status='PUBLISHED' ORDER BY a.created_at DESC LIMIT 4
      `).all() as Array<Record<string, unknown>>;

      const discussions = db.prepare(`
        SELECT d.id, d.title, d.category, d.created_at,
          (SELECT COUNT(*) FROM comments c WHERE c.discussion_id=d.id) AS comment_count
        FROM discussions d WHERE d.status='VISIBLE' ORDER BY d.created_at DESC LIMIT 4
      `).all() as Array<Record<string, unknown>>;

      const myIssueRows = db.prepare(`
        SELECT id, tracking_id, title, status, priority, updated_at FROM issues
        WHERE student_id=? ORDER BY updated_at DESC LIMIT 4
      `).all(session.id) as Array<Record<string, unknown>>;

      return ok({
        role: "STUDENT",
        stats: { myIssues, activeIssues, resolved, feedback, unread, doubts },
        announcements, discussions, myIssues: myIssueRows,
      });
    }

    if (session.role === "STAFF") {
      const assigned = (db.prepare("SELECT COUNT(*) c FROM issues WHERE assigned_staff_id=?").get(session.id) as { c: number }).c;
      const pending = (db.prepare("SELECT COUNT(*) c FROM issues WHERE assigned_staff_id=? AND status IN ('ASSIGNED','SUBMITTED','UNDER REVIEW')").get(session.id) as { c: number }).c;
      const inProgress = (db.prepare("SELECT COUNT(*) c FROM issues WHERE assigned_staff_id=? AND status='IN PROGRESS'").get(session.id) as { c: number }).c;
      const resolved = (db.prepare("SELECT COUNT(*) c FROM issues WHERE assigned_staff_id=? AND status IN ('RESOLVED','CLOSED')").get(session.id) as { c: number }).c;
      const unread = (db.prepare("SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0").get(session.id) as { c: number }).c;

      const issueRows = db.prepare(`
        SELECT i.id, i.tracking_id, i.title, i.status, i.priority, i.category, i.updated_at,
          CASE WHEN i.is_anonymous=1 THEN 'Anonymous Student' ELSE u.name END AS student_name
        FROM issues i JOIN users u ON u.id=i.student_id
        WHERE i.assigned_staff_id=? AND i.status NOT IN ('RESOLVED','CLOSED')
        ORDER BY CASE i.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 ELSE 3 END, i.updated_at DESC
        LIMIT 6
      `).all(session.id) as Array<Record<string, unknown>>;

      const announcements = db.prepare(`
        SELECT id, title, category, priority, created_at FROM announcements
        WHERE status='PUBLISHED' ORDER BY created_at DESC LIMIT 3
      `).all() as Array<Record<string, unknown>>;

      return ok({ role: "STAFF", stats: { assigned, pending, inProgress, resolved, unread }, issues: issueRows, announcements });
    }

    // ADMIN
    const insights = computeInsights();
    const unread = (db.prepare("SELECT COUNT(*) c FROM notifications WHERE user_id=? AND read=0").get(session.id) as { c: number }).c;
    const newIssues = (db.prepare("SELECT COUNT(*) c FROM issues WHERE status IN ('SUBMITTED','UNDER REVIEW')").get() as { c: number }).c;
    const openFeedback = (db.prepare("SELECT COUNT(*) c FROM feedback WHERE status IN ('SUBMITTED','UNDER REVIEW')").get() as { c: number }).c;

    const recentIssues = db.prepare(`
      SELECT i.id, i.tracking_id, i.title, i.status, i.priority, i.category, i.created_at,
        CASE WHEN i.is_anonymous=1 THEN 'Anonymous Student' ELSE u.name END AS student_name
      FROM issues i JOIN users u ON u.id=i.student_id
      ORDER BY i.created_at DESC LIMIT 5
    `).all() as Array<Record<string, unknown>>;

    const trending = db.prepare(`
      SELECT d.id, d.title, d.views, d.category,
        (SELECT COUNT(*) FROM comments c WHERE c.discussion_id=d.id) AS comment_count
      FROM discussions d WHERE d.status='VISIBLE'
      ORDER BY d.views DESC LIMIT 4
    `).all() as Array<Record<string, unknown>>;

    return ok({
      role: "ADMIN",
      kpis: insights.kpis,
      issuesByCategory: insights.issuesByCategory,
      issuesByStatus: insights.issuesByStatus,
      activityByDay: insights.activityByDay,
      insights: insights.insights.slice(0, 3),
      newIssues, openFeedback, unread, recentIssues, trending,
    });
  });
}
