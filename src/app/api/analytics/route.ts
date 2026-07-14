import { NextRequest } from "next/server";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { getAnalyticsSummary } from "@/lib/analytics";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

export async function GET(req: NextRequest) {
  const token = extractBearerToken(req);
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyToken(token);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email?.toLowerCase() || "")) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const summary = await getAnalyticsSummary();
    return Response.json(summary);
  } catch (error) {
    console.error("Analytics error:", error);
    return Response.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
