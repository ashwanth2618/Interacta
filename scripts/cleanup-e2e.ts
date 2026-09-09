/* Remove E2E test artifacts from the database.
   Run with: npx tsx scripts/cleanup-e2e.ts */
import { getDb } from "../lib/db";

const db = getDb();

// find the E2E test issue
const issue = db.prepare("SELECT id FROM issues WHERE title LIKE 'E2E test:%'").get() as { id: number } | undefined;
if (issue) {
  db.prepare("DELETE FROM issue_responses WHERE issue_id=?").run(issue.id);
  db.prepare("DELETE FROM issues WHERE id=?").run(issue.id);
  console.log("removed E2E issue", issue.id);
}

// E2E feedback
db.prepare("DELETE FROM feedback WHERE title LIKE 'E2E:%'").run();
// E2E discussion + its comments/notifications referencing it
const disc = db.prepare("SELECT id FROM discussions WHERE title LIKE 'E2E:%'").get() as { id: number } | undefined;
if (disc) {
  db.prepare("DELETE FROM comments WHERE discussion_id=?").run(disc.id);
  db.prepare("DELETE FROM discussions WHERE id=?").run(disc.id);
  console.log("removed E2E discussion", disc.id);
}
// E2E announcement
db.prepare("DELETE FROM announcements WHERE title LIKE 'E2E:%'").run();
// notifications about E2E items
db.prepare("DELETE FROM notifications WHERE body LIKE '%E2E%' OR title LIKE '%INT-1048%'").run();
db.prepare("DELETE FROM notifications WHERE body LIKE '%Mid-semester break%'").run();

const counts = ["users", "issues", "feedback", "discussions", "announcements", "notifications"].map(
  (t) => `${t}=${(db.prepare(`SELECT COUNT(*) c FROM ${t}`).get() as { c: number }).c}`
);
console.log("remaining:", counts.join(" "));
