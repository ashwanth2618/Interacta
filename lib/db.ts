import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const DB_PATH = path.join(process.cwd(), "interacta.db");

declare global {
  // eslint-disable-next-line no-var
  var __interactaDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  seedIfEmpty(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__interactaDb) {
    globalThis.__interactaDb = createDb();
  }
  return globalThis.__interactaDb;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('STUDENT','STAFF','ADMIN')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
      department TEXT,
      avatar_color TEXT NOT NULL DEFAULT '#4f46e5',
      student_id TEXT,
      year TEXT,
      course TEXT,
      designation TEXT,
      employee_id TEXT,
      skills TEXT NOT NULL DEFAULT '[]',
      interests TEXT NOT NULL DEFAULT '[]',
      career_preference TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tracking_id TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('SUBMITTED','UNDER REVIEW','ASSIGNED','IN PROGRESS','RESOLVED','CLOSED')),
      attachment_name TEXT,
      assigned_staff_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS issue_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
      responder_id INTEGER NOT NULL REFERENCES users(id),
      responder_role TEXT NOT NULL,
      message TEXT NOT NULL,
      is_internal INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL CHECK (type IN ('FEEDBACK','SUGGESTION','COMPLAINT','CONCERN')),
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'SUBMITTED'
        CHECK (status IN ('SUBMITTED','UNDER REVIEW','RESOLVED','CLOSED')),
      admin_response TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discussions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      likes TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'VISIBLE' CHECK (status IN ('VISIBLE','HIDDEN')),
      views INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discussion_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id),
      body TEXT NOT NULL,
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reporter_id INTEGER NOT NULL REFERENCES users(id),
      discussion_id INTEGER REFERENCES discussions(id) ON DELETE CASCADE,
      comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','REVIEWED','DISMISSED')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT')),
      expiry_date TEXT,
      attachment_name TEXT,
      status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED','DRAFT','ARCHIVED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      link TEXT NOT NULL DEFAULT '/',
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      mode TEXT NOT NULL DEFAULT 'ASSISTANT' CHECK (mode IN ('ASSISTANT','DOUBT')),
      title TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK (role IN ('user','assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      subject TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('DOUBT','ASSISTANT','DISCUSSION')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS career_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      degree TEXT,
      department TEXT,
      skills TEXT NOT NULL DEFAULT '[]',
      interests TEXT NOT NULL DEFAULT '[]',
      preferred_career TEXT,
      experience_level TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
    CREATE INDEX IF NOT EXISTS idx_issues_staff ON issues(assigned_staff_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
    CREATE INDEX IF NOT EXISTS idx_comments_discussion ON comments(discussion_id);
  `);
}

/* ------------------------------ seed ------------------------------ */

function daysAgo(n: number, hourOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + (hourOffset % 9), (hourOffset * 13) % 60, 0, 0);
  return d.toISOString();
}

function seedIfEmpty(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number };
  if (count.c > 0) return;

  const hash = bcrypt.hashSync("password123", 10);
  const AV = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, status, department, avatar_color,
      student_id, year, course, designation, employee_id, skills, interests, career_preference, created_at)
    VALUES (@name, @email, @hash, @role, 'ACTIVE', @department, @avatar_color,
      @student_id, @year, @course, @designation, @employee_id, @skills, @interests, @career_preference, @created_at)
  `);

  type U = Record<string, unknown>;
  const users: U[] = [
    { name: "Dr. Meera Krishnan", email: "admin@interacta.edu", role: "ADMIN", department: "Administration", designation: "Dean of Student Affairs", employee_id: "ADM-001", avatar_color: AV[0] },
    { name: "Prof. Anil Verma", email: "anil.verma@interacta.edu", role: "STAFF", department: "Computer Science", designation: "Associate Professor", employee_id: "CS-014", avatar_color: AV[1] },
    { name: "Prof. Kavitha Rao", email: "kavitha.rao@interacta.edu", role: "STAFF", department: "Information Technology", designation: "Assistant Professor", employee_id: "IT-021", avatar_color: AV[2] },
    { name: "Mr. Raghav Menon", email: "raghav.menon@interacta.edu", role: "STAFF", department: "Hostel & Facilities", designation: "Hostel Warden", employee_id: "HF-007", avatar_color: AV[3] },
    { name: "Ms. Divya Pillai", email: "divya.pillai@interacta.edu", role: "STAFF", department: "Training & Placement", designation: "Placement Officer", employee_id: "TP-003", avatar_color: AV[4] },
    { name: "Aarav Sharma", email: "student@interacta.edu", role: "STUDENT", department: "Computer Science", student_id: "CS21B045", year: "3rd Year", course: "B.Tech CSE", skills: JSON.stringify(["Java", "Python", "SQL"]), interests: JSON.stringify(["Web Development", "Machine Learning"]), career_preference: "Software Engineer", avatar_color: AV[5] },
    { name: "Priya Nair", email: "priya.nair@interacta.edu", role: "STUDENT", department: "Information Technology", student_id: "IT22A012", year: "2nd Year", course: "B.Tech IT", skills: JSON.stringify(["JavaScript", "React"]), interests: JSON.stringify(["UI/UX Design"]), career_preference: "Frontend Developer", avatar_color: AV[6] },
    { name: "Rohan Gupta", email: "rohan.gupta@interacta.edu", role: "STUDENT", department: "Electronics & Communication", student_id: "EC21C030", year: "3rd Year", course: "B.Tech ECE", skills: JSON.stringify(["C++", "MATLAB"]), interests: JSON.stringify(["Embedded Systems", "IoT"]), career_preference: "Embedded Engineer", avatar_color: AV[7] },
    { name: "Sneha Iyer", email: "sneha.iyer@interacta.edu", role: "STUDENT", department: "Computer Science", student_id: "CS22B052", year: "2nd Year", course: "B.Tech CSE", skills: JSON.stringify(["Python", "Pandas"]), interests: JSON.stringify(["Data Science", "AI"]), career_preference: "Data Analyst", avatar_color: AV[0] },
    { name: "Vikram Desai", email: "vikram.desai@interacta.edu", role: "STUDENT", department: "Mechanical Engineering", student_id: "ME20D008", year: "4th Year", course: "B.Tech ME", skills: JSON.stringify(["AutoCAD", "SolidWorks"]), interests: JSON.stringify(["Automotive Design"]), career_preference: "Design Engineer", avatar_color: AV[1] },
    { name: "Ananya Reddy", email: "ananya.reddy@interacta.edu", role: "STUDENT", department: "Computer Science", student_id: "CS23B071", year: "1st Year", course: "B.Tech CSE", skills: JSON.stringify(["C"]), interests: JSON.stringify(["Competitive Programming"]), career_preference: "Software Engineer", avatar_color: AV[2] },
    { name: "Karan Malhotra", email: "karan.malhotra@interacta.edu", role: "STUDENT", department: "Information Technology", student_id: "IT21A033", year: "3rd Year", course: "B.Tech IT", skills: JSON.stringify(["Java", "Spring Boot"]), interests: JSON.stringify(["Backend Development", "Cloud"]), career_preference: "Backend Developer", avatar_color: AV[3] },
  ];
  const ids: Record<string, number> = {};
  users.forEach((u, i) => {
    const info = insertUser.run({
      hash,
      created_at: daysAgo(120 - i),
      year: null, course: null, designation: null, employee_id: null,
      student_id: null, skills: "[]", interests: "[]", career_preference: null,
      ...u,
    } as never);
    ids[String(u.email)] = Number(info.lastInsertRowid);
  });

  const S = (email: string) => ids[email];
  const A = S("admin@interacta.edu");
  const anil = S("anil.verma@interacta.edu");
  const kavitha = S("kavitha.rao@interacta.edu");
  const raghav = S("raghav.menon@interacta.edu");
  const divya = S("divya.pillai@interacta.edu");
  const aarav = S("student@interacta.edu");
  const priya = S("priya.nair@interacta.edu");
  const rohan = S("rohan.gupta@interacta.edu");
  const sneha = S("sneha.iyer@interacta.edu");
  const vikram = S("vikram.desai@interacta.edu");
  const ananya = S("ananya.reddy@interacta.edu");
  const karan = S("karan.malhotra@interacta.edu");

  const insertIssue = db.prepare(`
    INSERT INTO issues (tracking_id, student_id, title, description, category, priority, is_anonymous,
      status, attachment_name, assigned_staff_id, created_at, updated_at)
    VALUES (@tracking_id, @student_id, @title, @description, @category, @priority, @is_anonymous,
      @status, @attachment_name, @assigned_staff_id, @created_at, @updated_at)
  `);
  const insertResp = db.prepare(`
    INSERT INTO issue_responses (issue_id, responder_id, responder_role, message, is_internal, created_at)
    VALUES (@issue_id, @responder_id, @responder_role, @message, @is_internal, @created_at)
  `);

  let tno = 1041;
  const mkIssue = (o: Record<string, unknown>) =>
    insertIssue.run({ tracking_id: `INT-${tno++}`, attachment_name: null, assigned_staff_id: null, ...o } as never);

  const i1 = mkIssue({
    student_id: aarav, title: "Projectors in CS Block 3 not working",
    description: "The projector in room CS-301 has not been working for two weeks. Classes are affected and we end up copying slides from a single screen.",
    category: "Infrastructure", priority: "HIGH", is_anonymous: 0, status: "RESOLVED",
    assigned_staff_id: raghav, created_at: daysAgo(14), updated_at: daysAgo(10),
  });
  const i2 = mkIssue({
    student_id: priya, title: "Canteen food quality dropped this month",
    description: "The quality of food in the main canteen has noticeably dropped — several students have had stomach issues after lunch this week.",
    category: "Canteen", priority: "URGENT", is_anonymous: 1, status: "IN PROGRESS",
    assigned_staff_id: raghav, created_at: daysAgo(8), updated_at: daysAgo(6),
  });
  const i3 = mkIssue({
    student_id: rohan, title: "Library closes too early during exam season",
    description: "During exams the library closes at 8 PM which is too early. Requesting extended hours till 11 PM for the exam period.",
    category: "Academics", priority: "MEDIUM", is_anonymous: 0, status: "ASSIGNED",
    assigned_staff_id: kavitha, created_at: daysAgo(6), updated_at: daysAgo(4),
  });
  const i4 = mkIssue({
    student_id: sneha, title: "College bus route 4 consistently late",
    description: "Bus route 4 arrives 20-30 minutes late every morning. Students miss the first-hour classes regularly.",
    category: "Transport", priority: "HIGH", is_anonymous: 0, status: "UNDER REVIEW",
    created_at: daysAgo(3), updated_at: daysAgo(2),
  });
  const i5 = mkIssue({
    student_id: karan, title: "Placement cell: need more product-company drives",
    description: "Most drives are service companies. Requesting the placement cell to invite product-based companies for the 2026 batch.",
    category: "Placement", priority: "MEDIUM", is_anonymous: 0, status: "SUBMITTED",
    created_at: daysAgo(1), updated_at: daysAgo(1),
  });
  const i6 = mkIssue({
    student_id: vikram, title: "WiFi in hostel block B keeps disconnecting",
    description: "Hostel B block WiFi drops every 10 minutes making online assignments impossible at night.",
    category: "Hostel", priority: "HIGH", is_anonymous: 1, status: "RESOLVED",
    assigned_staff_id: raghav, created_at: daysAgo(20), updated_at: daysAgo(17),
  });
  const i7 = mkIssue({
    student_id: ananya, title: "Revaluation results delayed for DS subject",
    description: "Applied for revaluation of Data Structures paper 6 weeks ago. Results are still not published and last date for supplementary is approaching.",
    category: "Examination", priority: "URGENT", is_anonymous: 0, status: "IN PROGRESS",
    assigned_staff_id: kavitha, created_at: daysAgo(5), updated_at: daysAgo(3),
  });

  insertResp.run({ issue_id: i1.lastInsertRowid, responder_id: A, responder_role: "ADMIN", message: "Issue forwarded to the Facilities team. Mr. Raghav Menon will coordinate the repair.", is_internal: 0, created_at: daysAgo(13) });
  insertResp.run({ issue_id: i1.lastInsertRowid, responder_id: raghav, responder_role: "STAFF", message: "New projector installed in CS-301. Maintenance vendor will service the remaining rooms this weekend.", is_internal: 0, created_at: daysAgo(10) });
  insertResp.run({ issue_id: i2.lastInsertRowid, responder_id: A, responder_role: "ADMIN", message: "Assigned to Hostel & Facilities. Food safety audit will be conducted this week. Since this was anonymous, we have logged it with the highest priority.", is_internal: 0, created_at: daysAgo(7) });
  insertResp.run({ issue_id: i2.lastInsertRowid, responder_id: raghav, responder_role: "STAFF", message: "Kitchen audit scheduled. We are also rotating the menu committee to include student representatives. Interim vendor inspection done yesterday.", is_internal: 0, created_at: daysAgo(6) });
  insertResp.run({ issue_id: i3.lastInsertRowid, responder_id: kavitha, responder_role: "STAFF", message: "Proposal sent to the librarian for extended hours (till 11 PM) from next Monday through the exam period.", is_internal: 0, created_at: daysAgo(4) });
  insertResp.run({ issue_id: i6.lastInsertRowid, responder_id: raghav, responder_role: "STAFF", message: "Two new access points installed in Block B. Please confirm the connection is stable now.", is_internal: 0, created_at: daysAgo(17) });

  const insertFeedback = db.prepare(`
    INSERT INTO feedback (student_id, type, category, title, description, priority, is_anonymous, status, admin_response, created_at, updated_at)
    VALUES (@student_id, @type, @category, @title, @description, @priority, @is_anonymous, @status, @admin_response, @created_at, @updated_at)
  `);
  insertFeedback.run({ student_id: aarav, type: "SUGGESTION", category: "Academics", title: "Weekly quiz portal for core subjects", description: "A small weekly quiz portal with instant explanations would help a lot before unit tests.", priority: "MEDIUM", is_anonymous: 0, status: "RESOLVED", admin_response: "Great suggestion! The CSE department has piloted a weekly quiz portal for DS and DBMS this semester.", created_at: daysAgo(12), updated_at: daysAgo(9) });
  insertFeedback.run({ student_id: priya, type: "COMPLAINT", category: "Infrastructure", title: "AC not working in seminar hall", description: "The seminar hall AC has been broken during every event this month.", priority: "HIGH", is_anonymous: 0, status: "UNDER REVIEW", admin_response: null, created_at: daysAgo(4), updated_at: daysAgo(3) });
  insertFeedback.run({ student_id: rohan, type: "FEEDBACK", category: "Placement", title: "Mock interviews were very useful", description: "The mock interview drive last week was excellent. Please schedule more with panel-style rounds.", priority: "LOW", is_anonymous: 0, status: "SUBMITTED", admin_response: null, created_at: daysAgo(2), updated_at: daysAgo(2) });
  insertFeedback.run({ student_id: sneha, type: "CONCERN", category: "Examination", title: "Lab exam schedule clashes with fest", description: "The DBMS lab exam is scheduled on the same day as the cultural fest finals.", priority: "MEDIUM", is_anonymous: 1, status: "SUBMITTED", admin_response: null, created_at: daysAgo(1), updated_at: daysAgo(1) });

  const insertDiscussion = db.prepare(`
    INSERT INTO discussions (author_id, title, body, category, is_anonymous, likes, status, views, created_at)
    VALUES (@author_id, @title, @body, @category, @is_anonymous, @likes, 'VISIBLE', @views, @created_at)
  `);
  const d1 = insertDiscussion.run({ author_id: karan, title: "How to prepare for OOPs interview questions in Java?", body: "Placements are coming up. What are the most-asked OOP concepts — and how deep should I go into polymorphism and interfaces? Any resources appreciated.", category: "Placements", is_anonymous: 0, likes: JSON.stringify([aarav, priya, sneha]), views: 142, created_at: daysAgo(6) } as never);
  const d2 = insertDiscussion.run({ author_id: sneha, title: "Study group for Machine Learning — anyone interested?", body: "Planning a weekly ML study group covering regression, classification and a small Kaggle project. All departments welcome, basic Python needed.", category: "Academics", is_anonymous: 0, likes: JSON.stringify([aarav, ananya, karan, priya]), views: 210, created_at: daysAgo(9) });
  const d3 = insertDiscussion.run({ author_id: priya, title: "Best resources to learn UI/UX as a beginner?", body: "I know React basics and want to move into UI/UX. Figma tutorials, design systems, portfolios — where do I start?", category: "Courses", is_anonymous: 0, likes: JSON.stringify([sneha]), views: 88, created_at: daysAgo(4) });
  const d4 = insertDiscussion.run({ author_id: vikram, title: "TechnoCultural fest 2026 — core team recruitment open!", body: "The fest core team is recruiting for logistics, sponsorships and design. Drop a comment if you want to join the task force.", category: "Events", is_anonymous: 0, likes: JSON.stringify([rohan, ananya]), views: 176, created_at: daysAgo(7) });
  const d5 = insertDiscussion.run({ author_id: rohan, title: "Tips for the Embedded Systems lab exam?", body: "Anyone from last year's batch — what should I focus on for the 8051 lab exam? Timers and interrupts scare me.", category: "Academics", is_anonymous: 0, likes: JSON.stringify([vikram]), views: 54, created_at: daysAgo(2) });

  const insertComment = db.prepare(`
    INSERT INTO comments (discussion_id, author_id, body, is_anonymous, created_at)
    VALUES (@discussion_id, @author_id, @body, 0, @created_at)
  `);
  insertComment.run({ discussion_id: d1.lastInsertRowid, author_id: anil, body: "Focus on the four pillars: encapsulation, inheritance, polymorphism, abstraction. Interviewers love real examples — e.g., method overriding for runtime polymorphism. I will share a question bank in class this week.", created_at: daysAgo(5) });
  insertComment.run({ discussion_id: d1.lastInsertRowid, author_id: aarav, body: "Practice explaining SOLID principles with one small code example each. That covered 70% of my interview last week.", created_at: daysAgo(5) });
  insertComment.run({ discussion_id: d2.lastInsertRowid, author_id: ananya, body: "Interested! I know basic Python. Count me in for the weekend sessions.", created_at: daysAgo(8) });
  insertComment.run({ discussion_id: d3.lastInsertRowid, author_id: divya, body: "Start with Figma's official YouTube playlist, then rebuild one existing app screen per week. Build 3 case-study projects before touching your portfolio.", created_at: daysAgo(3) });
  insertComment.run({ discussion_id: d5.lastInsertRowid, author_id: vikram, body: "Timers and serial communication are the most asked. Previous-year papers repeat almost 60%.", created_at: daysAgo(1) });

  const insertAnn = db.prepare(`
    INSERT INTO announcements (author_id, title, body, category, priority, expiry_date, attachment_name, status, created_at, updated_at)
    VALUES (@author_id, @title, @body, @category, @priority, @expiry_date, null, 'PUBLISHED', @created_at, @created_at)
  `);
  insertAnn.run({ author_id: A, title: "End-semester examination timetable published", body: "The end-semester examination timetable for all departments is now published on the examination portal. Students must carry their hall tickets and college ID. Seating charts will be displayed 48 hours before each exam. Requests for rescheduling due to genuine clashes must reach the examination cell within 5 working days.", category: "Exams", priority: "HIGH", expiry_date: daysAgo(-30), created_at: daysAgo(3) });
  insertAnn.run({ author_id: divya, title: "TCS NQT registration opens for final & pre-final years", body: "TCS National Qualifier Test registration is now open. Last date to register is the 20th. Shortlisted students will attend interviews on campus in the first week of next month. Contact the placement cell with your updated resume.", category: "Placements", priority: "URGENT", expiry_date: daysAgo(-15), created_at: daysAgo(2) });
  insertAnn.run({ author_id: A, title: "Inter-college hackathon 'InnovateX' — registrations open", body: "InnovateX 2026 is a 36-hour hackathon open to all departments. Teams of 3-4. Winning teams get incubation support and cash prizes. Register through the student activities portal before Friday.", category: "Competitions", priority: "HIGH", expiry_date: daysAgo(-10), created_at: daysAgo(5) });
  insertAnn.run({ author_id: A, title: "Rotaract Club: blood donation camp this Saturday", body: "The Rotaract Club is organizing a blood donation camp in the main auditorium from 9 AM to 3 PM this Saturday. Donors receive certificates and refreshments. Walk-ins welcome.", category: "Rotaract", priority: "MEDIUM", expiry_date: daysAgo(-5), created_at: daysAgo(4) });
  insertAnn.run({ author_id: A, title: "Workshop: Introduction to Cloud Computing with AWS", body: "The CSE department is hosting a hands-on AWS workshop covering EC2, S3 and deployment basics. Limited to 60 seats — register with the department office. Participants receive a certificate.", category: "Workshops", priority: "MEDIUM", expiry_date: daysAgo(-12), created_at: daysAgo(1) });
  insertAnn.run({ author_id: A, title: "Library extended hours during exam season", body: "Based on student requests, the central library will remain open until 11 PM from Monday until the end of the exam period. Please carry your ID card.", category: "Important", priority: "MEDIUM", expiry_date: daysAgo(-20), created_at: daysAgo(1) });

  const insertNotif = db.prepare(`
    INSERT INTO notifications (user_id, type, title, body, link, read, created_at)
    VALUES (@user_id, @type, @title, @body, @link, @read, @created_at)
  `);
  insertNotif.run({ user_id: aarav, type: "ISSUE", title: "Issue INT-1041 resolved", body: "Your issue 'Projectors in CS Block 3 not working' has been marked RESOLVED. View the response.", link: "/student/issues", read: 0, created_at: daysAgo(10) });
  insertNotif.run({ user_id: aarav, type: "DISCUSSION", title: "New reply to your comment", body: "Prof. Anil Verma replied in 'How to prepare for OOPs interview questions in Java?'.", link: `/student/discussions/${d1.lastInsertRowid}`, read: 0, created_at: daysAgo(5) });
  insertNotif.run({ user_id: aarav, type: "ANNOUNCEMENT", title: "New announcement", body: "Workshop: Introduction to Cloud Computing with AWS", link: "/student/announcements", read: 1, created_at: daysAgo(1) });
  insertNotif.run({ user_id: A, type: "ISSUE", title: "New issue submitted", body: "INT-1047 'Placement cell: need more product-company drives' needs review.", link: "/admin/issues", read: 0, created_at: daysAgo(1) });
  insertNotif.run({ user_id: A, type: "FEEDBACK", title: "New feedback submitted", body: "Anonymous concern: 'Lab exam schedule clashes with fest'.", link: "/admin/feedback", read: 0, created_at: daysAgo(1) });
  insertNotif.run({ user_id: raghav, type: "ASSIGNMENT", title: "Issue assigned to you", body: "INT-1042 'Canteen food quality dropped this month' (URGENT).", link: "/staff/issues", read: 0, created_at: daysAgo(7) });
  insertNotif.run({ user_id: kavitha, type: "ASSIGNMENT", title: "Issue assigned to you", body: "INT-1047 'Revaluation results delayed for DS subject' (URGENT).", link: "/staff/issues", read: 0, created_at: daysAgo(4) });

  const insertLA = db.prepare(`
    INSERT INTO learning_activities (user_id, topic, subject, kind, created_at)
    VALUES (@user_id, @topic, @subject, @kind, @created_at)
  `);
  const las: Array<[number, string, string, string, number]> = [
    [aarav, "Polymorphism", "Programming", "DOUBT", 9],
    [aarav, "SQL Joins", "Databases", "DOUBT", 7],
    [aarav, "Time Complexity", "DSA", "ASSISTANT", 5],
    [aarav, "Linked Lists", "DSA", "DOUBT", 4],
    [aarav, "Normalization", "Databases", "DOUBT", 2],
    [aarav, "Operating System Deadlocks", "OS", "DOUBT", 1],
    [sneha, "Linear Regression", "Machine Learning", "DOUBT", 6],
    [sneha, "Pandas DataFrames", "Data Science", "DOUBT", 3],
    [ananya, "Pointers in C", "Programming", "DOUBT", 8],
    [ananya, "Recursion", "DSA", "DOUBT", 5],
    [karan, "Spring Boot Basics", "Programming", "ASSISTANT", 10],
    [priya, "Flexbox vs Grid", "Web Development", "DOUBT", 4],
  ];
  las.forEach(([uid, topic, subject, kind, d]) => insertLA.run({ user_id: uid, topic, subject, kind, created_at: daysAgo(d) }));

  db.prepare(`
    INSERT INTO career_profiles (user_id, degree, department, skills, interests, preferred_career, experience_level, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(aarav, "B.Tech", "Computer Science", JSON.stringify(["Java", "Python", "SQL"]), JSON.stringify(["Web Development", "Machine Learning"]), "Software Engineer", "Beginner", daysAgo(30));

  db.prepare("INSERT INTO settings (key, value) VALUES ('platform_name', 'INTERACTA'), ('anonymous_reports_total', '2')").run();
}
