import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";

interface Recommendation {
  topic: string;
  subject: string;
  reason: string;
  kind: "reinforce" | "advance" | "explore";
  resources: string[];
}

/* Rule-based engine over the student's own activity + profile.
   Structured so an ML model (e.g., collaborative filtering or a
   knowledge-tracing model) can replace `buildRecommendations`
   without touching the API contract. */

const CURRICULUM: Record<string, { topic: string; subject: string }[]> = {
  Programming: [
    { topic: "OOP: Encapsulation & Abstraction", subject: "Programming" },
    { topic: "Exception Handling", subject: "Programming" },
    { topic: "Collections Framework", subject: "Programming" },
    { topic: "File I/O & Serialization", subject: "Programming" },
  ],
  DSA: [
    { topic: "Stacks & Queues", subject: "DSA" },
    { topic: "Trees & Traversals", subject: "DSA" },
    { topic: "Graph Algorithms (BFS/DFS)", subject: "DSA" },
    { topic: "Dynamic Programming Basics", subject: "DSA" },
    { topic: "Sorting & Searching", subject: "DSA" },
  ],
  DBMS: [
    { topic: "ER Modeling", subject: "DBMS" },
    { topic: "Transactions & ACID", subject: "DBMS" },
    { topic: "Indexes & Query Plans", subject: "DBMS" },
    { topic: "Subqueries & Views", subject: "DBMS" },
  ],
  OS: [
    { topic: "Process Scheduling", subject: "OS" },
    { topic: "Memory Management & Paging", subject: "OS" },
    { topic: "File Systems", subject: "OS" },
    { topic: "Synchronization Primitives", subject: "OS" },
  ],
  "Computer Networks": [
    { topic: "OSI & TCP/IP Layers", subject: "Computer Networks" },
    { topic: "Routing Algorithms", subject: "Computer Networks" },
    { topic: "Application Layer Protocols", subject: "Computer Networks" },
  ],
  "Machine Learning": [
    { topic: "Logistic Regression", subject: "Machine Learning" },
    { topic: "Decision Trees & Random Forests", subject: "Machine Learning" },
    { topic: "Model Evaluation Metrics", subject: "Machine Learning" },
    { topic: "Feature Engineering", subject: "Machine Learning" },
  ],
  Mathematics: [
    { topic: "Matrices & Determinants", subject: "Mathematics" },
    { topic: "Probability Distributions", subject: "Mathematics" },
    { topic: "Differentiation Applications", subject: "Mathematics" },
  ],
  "Web Development": [
    { topic: "Flexbox & Grid Layouts", subject: "Web Development" },
    { topic: "REST API Design", subject: "Web Development" },
    { topic: "Authentication & Sessions", subject: "Web Development" },
  ],
  Electronics: [
    { topic: "Digital Logic Gates", subject: "Electronics" },
    { topic: "8051 Timers & Interrupts", subject: "Electronics" },
    { topic: "Operational Amplifiers", subject: "Electronics" },
  ],
};

const NEXT_IN_SUBJECT: Record<string, string[]> = {
  Programming: ["Advanced OOP & design patterns", "Multithreading basics"],
  DSA: ["Dynamic programming patterns", "Greedy algorithms"],
  DBMS: ["Query optimization", "NoSQL concepts"],
  OS: ["Virtual memory & page replacement", "Distributed systems intro"],
  "Computer Networks": ["Network security fundamentals", "Wireless protocols"],
  "Machine Learning": ["Neural networks intro", "Model deployment basics"],
  Mathematics: ["Linear algebra applications in ML", "Statistics for data science"],
  "Web Development": ["State management patterns", "Performance optimization"],
  Electronics: ["Embedded C projects", "IoT protocols (MQTT)"],
};

const RESOURCES: Record<string, string[]> = {
  Programming: ["NPTEL: Programming in Java (Week 2-4)", "GeeksforGeeks topic sheet", "Solve 10 curated exercises"],
  DSA: ["LeetCode top interview 150 (easy set)", "NPTEL: Data Structures", "Visualgo visualizations"],
  DBMS: ["NPTEL: DBMS (Normalization week)", "SQLBolt interactive lessons", "Practice 15 join queries"],
  OS: ["Galvin chapter summaries", "OS simulator exercises", "Previous-year university questions"],
  "Computer Networks": ["Forouzan chapter MCQs", "Wireshark lab exercises", "Packet-tracer basics"],
  "Machine Learning": ["Kaggle Learn: Intro to ML", "StatQuest videos (regression)", "scikit-learn official tutorials"],
  Mathematics: ["Khan Academy practice sets", "Previous-year question papers", "3Blue1Brown essence videos"],
  "Web Development": ["MDN topic guides", "Build one mini-layout project", "Frontend Mentor challenges"],
  Electronics: ["Neso Academy playlists", "Tinkercad circuit simulations", "Lab manual re-practice"],
};

function buildRecommendations(
  activities: Array<{ topic: string; subject: string; kind: string; created_at: string }>,
  profile: { skills: string[]; interests: string[]; careerPreference: string | null; department: string | null }
): {
  recommendations: Recommendation[];
  weakAreas: Array<{ subject: string; doubts: number }>;
  roadmap: Array<{ week: string; focus: string; goal: string }>;
  practiceSuggestions: string[];
} {
  const subjectCount = new Map<string, number>();
  const topicSet = new Set<string>();
  for (const a of activities) {
    subjectCount.set(a.subject, (subjectCount.get(a.subject) ?? 0) + 1);
    topicSet.add(a.topic.toLowerCase());
  }
  const weakAreas = [...subjectCount.entries()]
    .map(([subject, doubts]) => ({ subject, doubts }))
    .sort((a, b) => b.doubts - a.doubts)
    .slice(0, 4);

  const recommendations: Recommendation[] = [];
  const used = new Set<string>();

  // 1. Reinforce weakest subjects with topics not yet asked about
  for (const w of weakAreas) {
    const pool = CURRICULUM[w.subject] ?? [];
    for (const c of pool) {
      if (!topicSet.has(c.topic.toLowerCase()) && recommendations.length < 5) {
        recommendations.push({
          topic: c.topic, subject: c.subject, kind: "reinforce",
          reason: `You asked ${w.doubts} doubt${w.doubts > 1 ? "s" : ""} in ${c.subject}. This adjacent topic closes common gaps.`,
          resources: RESOURCES[c.subject] ?? [],
        });
        used.add(c.topic);
      }
    }
  }

  // 2. Advance: next topics in the most active subject
  const top = weakAreas[0]?.subject;
  if (top && NEXT_IN_SUBJECT[top]) {
    for (const t of NEXT_IN_SUBJECT[top]) {
      if (recommendations.length < 6) {
        recommendations.push({
          topic: t, subject: top, kind: "advance",
          reason: `Natural next step after your recent ${top} activity.`,
          resources: RESOURCES[top] ?? [],
        });
      }
    }
  }

  // 3. Explore: map interests/career to subjects
  const interestText = [...profile.interests, profile.careerPreference ?? ""].join(" ").toLowerCase();
  const exploreMap: Array<[RegExp, string]> = [
    [/web|frontend|full.?stack|react/, "Web Development"],
    [/data|ml|machine|analyst|ai/, "Machine Learning"],
    [/backend|cloud|java|spring/, "DBMS"],
    [/embedded|iot|hardware/, "Electronics"],
  ];
  for (const [re, subject] of exploreMap) {
    if (re.test(interestText) && CURRICULUM[subject] && recommendations.length < 8) {
      const c = CURRICULUM[subject][0];
      if (!used.has(c.topic)) {
        recommendations.push({
          topic: c.topic, subject, kind: "explore",
          reason: `Aligns with your interest in ${profile.interests[0] ?? profile.careerPreference ?? "this area"}.`,
          resources: RESOURCES[subject] ?? [],
        });
        used.add(c.topic);
      }
    }
  }

  const practiceSuggestions = [
    `Re-solve your 3 most recent doubts without notes, then explain each aloud in 60 seconds.`,
    top ? `Set a 7-day streak: one ${top} problem daily.` : `Pick one subject this week and solve one problem daily.`,
    `Teach one concept you learned this week to a classmate or in a study group.`,
  ];

  const startSubject = top ?? profile.interests[0] ?? "Programming";
  const roadmap = [
    { week: "Week 1-2", focus: `Consolidate ${startSubject} fundamentals`, goal: `Finish the reinforce list for ${startSubject} + 10 practice problems` },
    { week: "Week 3-4", focus: `Advance in ${startSubject}`, goal: (NEXT_IN_SUBJECT[startSubject] ?? ["Next chapter in syllabus"])[0] },
    { week: "Week 5-6", focus: "Apply via mini-project", goal: `Small project or lab set using ${startSubject}` },
    { week: "Week 7-8", focus: "Assess & iterate", goal: "Attempt a timed mock test; feed results back into INTERACTA doubts" },
  ];

  return { recommendations, weakAreas, roadmap, practiceSuggestions };
}

export async function GET() {
  return withApi(async () => {
    const session = await requireRole("STUDENT");
    const db = getDb();

    const activities = db.prepare(
      "SELECT topic, subject, kind, created_at FROM learning_activities WHERE user_id=? ORDER BY created_at DESC LIMIT 60"
    ).all(session.id) as Array<{ topic: string; subject: string; kind: string; created_at: string }>;

    const u = db.prepare("SELECT skills, interests, career_preference, department FROM users WHERE id=?").get(session.id) as { skills: string; interests: string; career_preference: string | null; department: string | null };
    const profile = {
      skills: JSON.parse(String(u.skills ?? "[]")) as string[],
      interests: JSON.parse(String(u.interests ?? "[]")) as string[],
      careerPreference: u.career_preference,
      department: u.department,
    };

    const result = buildRecommendations(activities, profile);
    return ok({ ...result, activityCount: activities.length });
  });
}
