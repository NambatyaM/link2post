import { NextRequest } from "next/server";
import { verifyToken, extractBearerToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hearAbout, improvement } = await req.json() as {
      hearAbout?: string;
      improvement?: string;
    };

    const supabase = getSupabaseServer(req, token);
    const { error } = await supabase.from("signup_feedback").insert({
      user_id: user.userId,
      hear_about: (hearAbout || "").slice(0, 500),
      improvement: (improvement || "").slice(0, 500),
    });

    if (error) {
      console.error("Signup feedback save error:", error);
      return Response.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Signup feedback error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
