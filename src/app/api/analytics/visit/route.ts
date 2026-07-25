import { NextRequest } from "next/server";
import { recordVisit } from "@/lib/analytics";

const visitCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const entry = visitCounts.get(ip);

    if (entry && now < entry.resetAt) {
      if (entry.count >= RATE_LIMIT) {
        return Response.json({ ok: true, rateLimited: true });
      }
      entry.count++;
    } else {
      visitCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    }

    const { deviceId, sessionId, path } = await req.json() as {
      deviceId?: string;
      sessionId?: string;
      path?: string;
    };

    if (!path || typeof path !== "string" || path.length > 2048) {
      return Response.json({ ok: true });
    }

    const result = await recordVisit({
      deviceId,
      path: path || "/",
      sessionId,
    });

    return Response.json({ ok: true, isReturn: result.isReturn });
  } catch {
    return Response.json({ ok: true, isReturn: false });
  }
}
