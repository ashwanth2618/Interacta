import { getDb } from "./db";
import { detectSubject } from "./ai";

export interface Kpis {
  totalStudents: number;
  totalStaff: number;
  activeIssues: number;
  resolvedIssues: number;
  feedbackCount: number;
  discussionsCount: number;
  announcementsCount: number;
  anonymousShare: number;
  resolutionRate: number;
  avgResolutionHours: number | null;
}

export interface Insight {
  id: string;
  tone: "positive" | "warning" | "info";
  title: string;
  detail: string;
  actions: string[];
}

export interface Insights {
  kpis: Kpis;
  issuesByCategory: Array<{ name: string; value: number }>;
  issuesByStatus: Array<{ name: string; value: number }>;
  issuesByPriority: Array<{ name: string; value: number }>;
  feedbackByType: Array<{ name: string; value: number }>;
  activityByDay: Array<{ day: string; issues: number; feedback: number; discussions: number }>;
  doubtsBySubject: Array<{ name: string; value: number }>;
  hotTopics: Array<{ topic: string; count: number }>;
  insights: Insight[];
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 100);
}

export function computeInsights(): Insights {
  const db = getDb();

  const one = (sql: string, args: unknown[] = []): number =>
    (db.prepare(sql).get(...args) as { c: number }).c;

  const totalStudents = one("SELECT COUNT(*) c FROM users WHERE role='STUDENT'");
  const totalStaff = one("SELECT COUNT(*) c FROM users WHERE role IN ('STAFF','ADMIN')");
  const activeIssues = one("SELECT COUNT(*) c FROM issues WHERE status NOT IN ('RESOLVED','CLOSED')");
  const resolvedIssues = one("SELECT COUNT(*) c FROM issues WHERE status IN ('RESOLVED','CLOSED')");
  const feedbackCount = one("SELECT COUNT(*) c FROM feedback");
  const discussionsCount = one("SELECT COUNT(*) c FROM discussions");
  const announcementsCount = one("SELECT COUNT(*) c FROM announcements WHERE status='PUBLISHED'");
  const anonymousIssues = one("SELECT COUNT(*) c FROM issues WHERE is_anonymous=1");
  const anonymousShare = pct(anonymousIssues, one("SELECT COUNT(*) c FROM issues"));

  const avgHoursRow = db.prepare(`
    SELECT (julianday(updated_at) - julianday(created_at)) * 24 AS hours
    FROM issues WHERE status IN ('RESOLVED','CLOSED')
  `).all() as Array<{ hours: number }>;
  const hours = avgHoursRow.map((r) => r.hours).filter((h) => Number.isFinite(h) && h >= 0);
  const avgResolutionHours = hours.length ? Math.round(hours.reduce((a, b) => a + b, 0) / hours.length) : null;

  const issuesByCategory = (db.prepare(
    "SELECT category AS name, COUNT(*) AS value FROM issues GROUP BY category ORDER BY value DESC"
  ).all() as Array<{ name: string; value: number }>);

  const statusOrder = ["SUBMITTED", "UNDER REVIEW", "ASSIGNED", "IN PROGRESS", "RESOLVED", "CLOSED"];
  const rawStatus = db.prepare("SELECT status AS name, COUNT(*) AS value FROM issues GROUP BY status").all() as Array<{ name: string; value: number }>;
  const issuesByStatus = statusOrder
    .map((s) => ({ name: s, value: rawStatus.find((r) => r.name === s)?.value ?? 0 }));

  const priOrder = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const rawPri = db.prepare("SELECT priority AS name, COUNT(*) AS value FROM issues GROUP BY priority").all() as Array<{ name: string; value: number }>;
  const issuesByPriority = priOrder.map((p) => ({ name: p, value: rawPri.find((r) => r.name === p)?.value ?? 0 }));

  const rawFb = db.prepare("SELECT type AS name, COUNT(*) AS value FROM feedback GROUP BY type").all() as Array<{ name: string; value: number }>;
  const fbOrder = ["FEEDBACK", "SUGGESTION", "COMPLAINT", "CONCERN"];
  const feedbackByType = fbOrder.map((t) => ({ name: t, value: rawFb.find((r) => r.name === t)?.value ?? 0 }));

  // last 14 days activity
  const activityByDay: Array<{ day: string; issues: number; feedback: number; discussions: number }> = [];
  const dayKey = (iso: string) => iso.slice(0, 10);
  const keyByIndex = new Map<number, string>();
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    keyByIndex.set(activityByDay.length, d.toISOString().slice(0, 10));
    activityByDay.push({
      day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      issues: 0, feedback: 0, discussions: 0,
    });
  }
  const issuesRows = db.prepare("SELECT created_at FROM issues").all() as Array<{ created_at: string }>;
  const fbRows = db.prepare("SELECT created_at FROM feedback").all() as Array<{ created_at: string }>;
  const discRows = db.prepare("SELECT created_at FROM discussions").all() as Array<{ created_at: string }>;
  const bump = (rows: Array<{ created_at: string }>, field: "issues" | "feedback" | "discussions") => {
    for (const r of rows) {
      const k = dayKey(r.created_at);
      for (const [idx, v] of keyByIndex) {
        if (v === k) { activityByDay[idx][field] += 1; break; }
      }
    }
  };
  bump(issuesRows, "issues");
  bump(fbRows, "feedback");
  bump(discRows, "discussions");

  // academic doubts from learning activities + discussion text
  const topics = new Map<string, number>();
  const subjectCount = new Map<string, number>();
  const laRows = db.prepare("SELECT topic FROM learning_activities").all() as Array<{ topic: string }>;
  const discBodies = db.prepare("SELECT title, body FROM discussions").all() as Array<{ title: string; body: string }>;
  for (const r of laRows) {
    topics.set(r.topic, (topics.get(r.topic) ?? 0) + 1);
    subjectCount.set(detectSubject(r.topic), (subjectCount.get(detectSubject(r.topic)) ?? 0) + 1);
  }
  for (const d of discBodies) {
    for (const seg of [d.title, d.body]) {
      for (const e of findTopicMentions(seg)) {
        topics.set(e, (topics.get(e) ?? 0) + 1);
      }
    }
  }
  const doubtsBySubject = [...subjectCount.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const hotTopics = [...topics.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  /* ---------------- rule-based insight generation ---------------- */
  const insights: Insight[] = [];
  const totalIssues = activeIssues + resolvedIssues;
  const resRate = pct(resolvedIssues, totalIssues);

  const infraShare = pct(issuesByCategory.find((c) => c.name === "Infrastructure")?.value ?? 0, totalIssues || 1);
  const hostelShare = pct(issuesByCategory.find((c) => c.name === "Hostel")?.value ?? 0, totalIssues || 1);
  const canteenShare = pct(issuesByCategory.find((c) => c.name === "Canteen")?.value ?? 0, totalIssues || 1);
  const urgentCount = issuesByPriority.find((p) => p.name === "URGENT")?.value ?? 0;
  const complaints = feedbackByType.find((f) => f.name === "COMPLAINT")?.value ?? 0;
  const concerns = feedbackByType.find((f) => f.name === "CONCERN")?.value ?? 0;
  const suggestions = feedbackByType.find((f) => f.name === "SUGGESTION")?.value ?? 0;

  if (hostelShare + canteenShare >= 25 && hostelShare + canteenShare > 0) {
    insights.push({
      id: "campus-life",
      tone: "warning",
      title: `Campus-life issues (hostel + canteen) represent ${hostelShare + canteenShare}% of reported concerns`,
      detail: `Hostel-related issues are ${hostelShare}% and canteen-related ${canteenShare}% of all reported issues. Several of these arrive anonymously, indicating students hesitate to report openly — a strong signal to act visibly on this category.`,
      actions: [
        "Publish a status update on hostel/canteen improvements via the notice board",
        "Schedule a monthly review with the Hostel & Facilities team",
      ],
    });
  }
  if (resRate >= 60) {
    insights.push({
      id: "resolution",
      tone: "positive",
      title: `Issue resolution rate is strong at ${resRate}%`,
      detail: `${resolvedIssues} of ${totalIssues} issues are resolved or closed${avgResolutionHours !== null ? `, averaging ~${avgResolutionHours}h to resolution` : ""}. Students receive notifications at every status change, reinforcing trust in the process.`,
      actions: ["Maintain current assignment SLAs", "Feature resolution stories in the next announcement to boost confidence"],
    });
  } else {
    insights.push({
      id: "resolution",
      tone: "warning",
      title: `Resolution rate is ${resRate}% — below the healthy threshold of 60%`,
      detail: `${activeIssues} issues are still active. Older issues left unassigned or unreviewed directly reduce student trust in the platform.`,
      actions: ["Assign all SUBMITTED issues older than 48 hours", "Add resolution-note requirements for staff when closing issues"],
    });
  }
  if (anonymousShare >= 20) {
    insights.push({
      id: "anonymity",
      tone: "info",
      title: `${anonymousShare}% of issues are submitted anonymously`,
      detail: "A meaningful share of students choose anonymity — evidence that anonymity is unlocking concerns that would otherwise go unreported. Identity is protected: aggregated analytics never expose who filed anonymous reports.",
      actions: ["Keep anonymity messaging prominent on submission forms", "Respond to anonymous issues publicly on the notice board where possible"],
    });
  }
  if (urgentCount > 0) {
    insights.push({
      id: "urgent",
      tone: "warning",
      title: `${urgentCount} URGENT-priority issue${urgentCount > 1 ? "s" : ""} require${urgentCount > 1 ? "" : "s"} attention`,
      detail: "Urgent issues carry the highest escalation risk. Each one should have an assigned owner and a visible next step today.",
      actions: ["Filter the issues board by URGENT and confirm owners", "Set 24h response expectations for urgent categories"],
    });
  }
  const topSubject = doubtsBySubject[0];
  if (topSubject) {
    insights.push({
      id: "academics",
      tone: "positive",
      title: `"${topSubject.name}" leads academic doubt activity on the platform`,
      detail: `Across ${doubtsBySubject.reduce((a, b) => a + b.value, 0)} tracked learning activities, ${topSubject.name} appears most often. Hot discussion topics include ${hotTopics.slice(0, 3).map((t) => t.topic).join(", ")}.`,
      actions: [
        "Organize a remedial session or workshop on the top topic",
        "Share curated resources through the notice board",
      ],
    });
  }
  if (complaints + concerns > suggestions) {
    insights.push({
      id: "sentiment",
      tone: "warning",
      title: "Complaints and concerns outweigh suggestions in feedback",
      detail: `${complaints} complaints and ${concerns} concerns vs ${suggestions} suggestions. Rising complaint volume often precedes issue spikes — act before they escalate into formal issues.`,
      actions: ["Review all UNDER REVIEW feedback for responses", "Close the loop publicly: publish 'you said, we did' updates"],
    });
  } else if (suggestions > 0) {
    insights.push({
      id: "sentiment",
      tone: "positive",
      title: "Students are actively contributing improvement suggestions",
      detail: `${suggestions} suggestion${suggestions > 1 ? "s" : ""} submitted. Suggestions are a leading indicator of engagement and goodwill.`,
      actions: ["Acknowledge top suggestions on the notice board", "Pilot the highest-impact suggestion this semester"],
    });
  }
  const recentActivity = activityByDay.slice(-7).reduce((a, d) => a + d.issues + d.feedback + d.discussions, 0);
  const prevActivity = activityByDay.slice(0, 7).reduce((a, d) => a + d.issues + d.feedback + d.discussions, 0);
  if (recentActivity > prevActivity) {
    insights.push({
      id: "engagement",
      tone: "positive",
      title: `Platform engagement is rising — ${recentActivity} interactions in the last 7 days`,
      detail: `Up from ${prevActivity} in the previous week (${pct(recentActivity - prevActivity, prevActivity || 1)}% growth). The communication loop — student action → admin/staff response → notification → resolution — is compounding trust.`,
      actions: ["Sustain response times as volume grows", "Add staff reviewers if active-issue backlog grows beyond 10 per staff member"],
    });
  }
  if (infraShare >= 20) {
    insights.push({
      id: "infra",
      tone: "warning",
      title: `Infrastructure concerns account for ${infraShare}% of all issues`,
      detail: "Recurring infrastructure complaints typically cluster around specific rooms, blocks or equipment. A facilities audit of the top-mentioned locations usually resolves the cluster at once.",
      actions: ["Group infrastructure issues by location and audit the top cluster", "Publish preventive maintenance schedules"],
    });
  }

  const toneRank = { warning: 0, positive: 1, info: 2 } as const;
  insights.sort((a, b) => toneRank[a.tone] - toneRank[b.tone]);

  return {
    kpis: {
      totalStudents, totalStaff, activeIssues, resolvedIssues,
      feedbackCount, discussionsCount, announcementsCount,
      anonymousShare, resolutionRate: resRate, avgResolutionHours,
    },
    issuesByCategory, issuesByStatus, issuesByPriority, feedbackByType,
    activityByDay, doubtsBySubject, hotTopics, insights,
  };
}

function findTopicMentions(text: string): string[] {
  const known = [
    "polymorphism", "inheritance", "recursion", "pointers", "linked list", "sql", "joins",
    "normalization", "deadlock", "regression", "react", "spring boot", "flexbox", "embedded",
    "machine learning", "data structures", "algorithms", "operating systems",
  ];
  const s = text.toLowerCase();
  return known.filter((k) => s.includes(k));
}
