import { getDb } from "./db";

export function notify(
  userId: number,
  type: "ISSUE" | "FEEDBACK" | "DISCUSSION" | "ANNOUNCEMENT" | "ASSIGNMENT" | "STATUS",
  title: string,
  body: string,
  link: string
) {
  getDb()
    .prepare(
      "INSERT INTO notifications (user_id, type, title, body, link, read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)"
    )
    .run(userId, type, title, body, link, new Date().toISOString());
}

export function notifyMany(
  userIds: number[],
  type: "ISSUE" | "FEEDBACK" | "DISCUSSION" | "ANNOUNCEMENT" | "ASSIGNMENT" | "STATUS",
  title: string,
  body: string,
  link: string
) {
  for (const id of userIds) notify(id, type, title, body, link);
}

export function logLearningActivity(
  userId: number,
  topic: string,
  kind: "DOUBT" | "ASSISTANT" | "DISCUSSION",
  subject?: string
) {
  getDb()
    .prepare(
      "INSERT INTO learning_activities (user_id, topic, subject, kind, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(userId, topic.slice(0, 120), subject ?? "General", kind, new Date().toISOString());
}

export function allActiveStaff(): Array<{ id: number }> {
  return getDb().prepare("SELECT id FROM users WHERE role='STAFF' AND status='ACTIVE'").all() as Array<{ id: number }>;
}

export function allStudents(): Array<{ id: number }> {
  return getDb().prepare("SELECT id FROM users WHERE role='STUDENT' AND status='ACTIVE'").all() as Array<{ id: number }>;
}
