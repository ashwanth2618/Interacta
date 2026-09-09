/* Seed + verify the database outside the Next.js process.
   Run with: npx tsx scripts/verify-seed.ts */
import { getDb } from "../lib/db";

const db = getDb();

const tables = ["users", "issues", "issue_responses", "feedback", "discussions", "comments", "announcements", "notifications", "learning_activities", "career_profiles"];
console.log("=== SEED VERIFICATION ===");
for (const t of tables) {
  const c = (db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number }).c;
  console.log(`${t.padEnd(22)} ${c}`);
}

// integrity checks
const orphanResponses = (db.prepare(`
  SELECT COUNT(*) c FROM issue_responses r
  LEFT JOIN users u ON u.id = r.responder_id
  WHERE u.id IS NULL
`).get() as { c: number }).c;
console.log("orphan responses   ", orphanResponses, orphanResponses === 0 ? "OK" : "FAIL");

const anonIssue = db.prepare("SELECT tracking_id FROM issues WHERE is_anonymous=1 LIMIT 1").get() as { tracking_id: string } | undefined;
console.log("anonymous issue    ", anonIssue?.tracking_id ?? "none");

const staffIssue = db.prepare(`
  SELECT i.tracking_id, u.name FROM issues i JOIN users u ON u.id = i.assigned_staff_id LIMIT 3
`).all() as Array<{ tracking_id: string; name: string }>;
console.log("assigned issues    ", staffIssue.map((r) => `${r.tracking_id}→${r.name}`).join(", "));

const notifs = db.prepare("SELECT COUNT(*) c FROM notifications WHERE user_id = (SELECT id FROM users WHERE email='student@interacta.edu')").get() as { c: number };
console.log("student notifs     ", notifs.c);
