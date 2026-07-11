import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    const { deviceId } = await req.json();

    if (!deviceId || typeof deviceId !== "string" || !UUID_RE.test(deviceId)) {
      return NextResponse.json(
        { error: "Invalid device ID." },
        { status: 400 },
      );
    }

    const token = await signToken({ deviceId, plan: "free" });
    return NextResponse.json({ token });
  } catch (error) {
    console.error("Token generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate token." },
      { status: 500 },
    );
  }
}
