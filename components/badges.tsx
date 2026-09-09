import { statusTone, priorityIcon } from "@/lib/constants";

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${statusTone[status] ?? "bg-ink-100 text-ink-600 ring-1 ring-ink-200"}`}>{status}</span>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <span className={`badge ${statusTone[priority] ?? "bg-ink-100 text-ink-600"}`}>{priorityIcon[priority]} {priority}</span>;
}

export function AnonBadge() {
  return <span className="badge bg-ink-900 text-white">🕵️ Anonymous</span>;
}

export function CategoryChip({ children }: { children: React.ReactNode }) {
  return <span className="badge bg-brand-50 text-brand-700 ring-1 ring-brand-100">{children}</span>;
}
