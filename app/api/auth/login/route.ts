import { NextRequest } from "next/server";
import { authenticate, HttpError } from "@/lib/auth";
import { signSession } from "@/lib/jwt";
import { ok, fail, withApi } from "@/lib/api";

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const body = await req.json().catch(() => null);
    if (!body) throw new HttpError(400, "Invalid request body");

    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");
    if (!email || !password) throw new HttpError(400, "Email and password are required");

    const user = authenticate(email, password);
    if (!user) return fail(401, "Invalid email or password");

    const token = await signSession(user);
    const res = ok({ user });
    res.cookies.set("interacta_session", token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  });
}
