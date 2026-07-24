import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getUserPlan } from "@/lib/rate-limit";
import { checkMonthlyQuota } from "@/lib/features";

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return Response.json({ plan: "free", quotas: { projects: { used: 0, limit: 1 }, posts: { used: 0, limit: 5 } } });
    }

    const user = await verifyToken(token);
    if (!user) {
      return Response.json({ plan: "free", quotas: { projects: { used: 0, limit: 1 }, posts: { used: 0, limit: 5 } } });
    }

    const plan = await getUserPlan(user.userId);
    const projectQuota = await checkMonthlyQuota(user.userId, "projects", plan);
    const postQuota = await checkMonthlyQuota(user.userId, "posts", plan);

    return Response.json(
      {
        plan,
        quotas: {
          projects: { used: projectQuota.used, limit: projectQuota.limit },
          posts: { used: postQuota.used, limit: postQuota.limit },
        },
      },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch {
    return Response.json({ plan: "free", quotas: { projects: { used: 0, limit: 1 }, posts: { used: 0, limit: 5 } } });
  }
}
