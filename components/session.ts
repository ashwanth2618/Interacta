import type { SessionUser } from "@/lib/auth";

export async function getSessionClient(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  const j = await res.json();
  return (j.user as SessionUser) ?? null;
}
