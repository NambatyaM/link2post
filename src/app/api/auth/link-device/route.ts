import { NextRequest } from "next/server";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { linkDeviceToUser } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { deviceId } = await req.json();
    if (!deviceId) {
      return Response.json({ error: "Missing deviceId." }, { status: 400 });
    }

    const token = extractBearerToken(req);
    if (!token) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return Response.json({ error: "Invalid token." }, { status: 401 });
    }

    await linkDeviceToUser(deviceId, user.userId);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Link device error:", error);
    return Response.json({ error: "Failed to link device." }, { status: 500 });
  }
}
