import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "interacta-dev-secret-change-in-production-0f8s7d6f"
);

export type Role = "STUDENT" | "STAFF" | "ADMIN";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  avatarColor: string;
  studentId: string | null;
}

export const SESSION_COOKIE = "interacta_session";

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (typeof payload.id !== "number" || typeof payload.role !== "string") return null;
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
