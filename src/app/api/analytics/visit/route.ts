import { NextRequest } from "next/server";
import { recordVisit } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    const { deviceId, sessionId, path } = await req.json() as {
      deviceId?: string;
      sessionId?: string;
      path?: string;
    };

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
