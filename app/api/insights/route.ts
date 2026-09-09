import { requireRole } from "@/lib/auth";
import { ok, withApi } from "@/lib/api";
import { computeInsights } from "@/lib/insights";
import { aiProviderName } from "@/lib/ai";

export async function GET() {
  return withApi(async () => {
    await requireRole("ADMIN");
    return ok({ ...computeInsights(), provider: aiProviderName() });
  });
}
