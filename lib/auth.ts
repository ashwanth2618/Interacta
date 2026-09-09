import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { signSession, verifySessionToken, SESSION_COOKIE, type SessionUser, type Role } from "./jwt";

export { signSession, verifySessionToken, SESSION_COOKIE };
export type { SessionUser, Role };

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Authentication required");
  if (roles.length && !roles.includes(session.role)) {
    throw new HttpError(403, "You do not have permission to perform this action");
  }
  return session;
}

export function toSessionUser(row: {
  id: number; name: string; email: string; role: Role; department: string | null;
  avatar_color: string; student_id: string | null;
}): SessionUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    avatarColor: row.avatar_color,
    studentId: row.student_id,
  };
}

export function authenticate(email: string, password: string): SessionUser | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM users WHERE lower(email) = lower(?) AND status = 'ACTIVE'")
    .get(email.trim()) as
    | { id: number; name: string; email: string; role: Role; department: string | null; avatar_color: string; student_id: string | null; password_hash: string }
    | undefined;
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return toSessionUser(row);
}
