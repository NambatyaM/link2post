import { NextRequest } from "next/server";
import { recordSignup } from "@/lib/analytics";
import { verifyToken, extractBearerToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authUser = await verifyToken(token);
    if (!authUser) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { source, referrerCode, deviceId } = await req.json() as {
      source?: string;
      referrerCode?: string;
      deviceId?: string;
    };

    await recordSignup({ userId: authUser.userId, source, referrerCode, deviceId });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: true });
  }
}
