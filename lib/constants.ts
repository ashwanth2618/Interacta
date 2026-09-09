export const ISSUE_CATEGORIES = [
  "Academics", "Infrastructure", "Hostel", "Transport", "Canteen",
  "Placement", "Faculty", "Examination", "Administration", "Other",
] as const;

export const FEEDBACK_CATEGORIES = [
  "Academics", "Infrastructure", "Hostel", "Transport", "Canteen",
  "Placement", "Faculty", "Examination", "Administration", "Other",
] as const;

export const DISCUSSION_CATEGORIES = [
  "Academics", "Placements", "Events", "Clubs", "Courses", "Campus", "General",
] as const;

export const ANNOUNCEMENT_CATEGORIES = [
  "Academic Notices", "Exams", "Placements", "Workshops", "Cultural Events",
  "Competitions", "Rotaract", "NCC", "NSS", "Clubs", "Scholarships", "Important",
] as const;

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ISSUE_STATUSES = ["SUBMITTED", "UNDER REVIEW", "ASSIGNED", "IN PROGRESS", "RESOLVED", "CLOSED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const FEEDBACK_STATUSES = ["SUBMITTED", "UNDER REVIEW", "RESOLVED", "CLOSED"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_TYPES = ["FEEDBACK", "SUGGESTION", "COMPLAINT", "CONCERN"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const statusTone: Record<string, string> = {
  SUBMITTED: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "UNDER REVIEW": "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  ASSIGNED: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  "IN PROGRESS": "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CLOSED: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  PUBLISHED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  DRAFT: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  ARCHIVED: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  LOW: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  MEDIUM: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  HIGH: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  URGENT: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  INACTIVE: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  VISIBLE: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200",
  HIDDEN: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  FEEDBACK: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  SUGGESTION: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  COMPLAINT: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  CONCERN: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
};

export const priorityIcon: Record<string, string> = {
  LOW: "↓", MEDIUM: "→", HIGH: "↑", URGENT: "⬆",
};

export const ROLE_HOME: Record<string, string> = {
  STUDENT: "/student",
  STAFF: "/staff",
  ADMIN: "/admin",
};
