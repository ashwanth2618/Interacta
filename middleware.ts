import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/jwt";

const ROLE_HOME: Record<string, string> = { STUDENT: "/student", STAFF: "/staff", ADMIN: "/admin" };
const PUBLIC = ["/", "/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // API routes enforce auth themselves via requireRole() — never redirect these
  if (pathname.startsWith("/api")) return NextResponse.next();

  if (PUBLIC.includes(pathname)) {
    // signed-in users skip auth pages
    if (pathname === "/login" || pathname === "/register") {
      const token = req.cookies.get("interacta_session")?.value;
      if (token) {
        const s = await verifySessionToken(token);
        if (s) return NextResponse.redirect(new URL(ROLE_HOME[s.role] ?? "/", req.url));
      }
    }
    return NextResponse.next();
  }

  const token = req.cookies.get("interacta_session")?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const area = "/" + pathname.split("/")[1];
  if (ROLE_HOME[session.role] && !pathname.startsWith(ROLE_HOME[session.role]) && area !== "/shared") {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"],
};
