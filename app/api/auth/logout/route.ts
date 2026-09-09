import { ok, withApi } from "@/lib/api";

export async function POST() {
  return withApi(async () => {
    const res = ok({ success: true });
    res.cookies.set("interacta_session", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  });
}
