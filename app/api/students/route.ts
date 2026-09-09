import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";

export async function GET() {
  return withApi(async () => {
    await requireRole("ADMIN");
    const db = getDb();
    const rows = db.prepare(`
      SELECT u.id, u.name, u.email, u.student_id, u.department, u.year, u.course, u.status,
        u.avatar_color, u.created_at,
        (SELECT COUNT(*) FROM issues i WHERE i.student_id = u.id) AS issues,
        (SELECT COUNT(*) FROM feedback f WHERE f.student_id = u.id) AS feedback,
        (SELECT COUNT(*) FROM discussions d WHERE d.author_id = u.id) AS discussions,
        (SELECT COUNT(*) FROM learning_activities la WHERE la.user_id = u.id) AS activities
      FROM users u WHERE u.role='STUDENT' ORDER BY u.name
    `).all() as Array<Record<string, unknown>>;
    return ok({ students: rows });
  });
}
