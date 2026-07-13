import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { itemId, feedback } = await req.json() as {
      itemId: string;
      feedback: "up" | "down";
    };

    if (!itemId || !feedback) {
      return Response.json({ error: "Missing itemId or feedback" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from("calendar_items")
      .update({ feedback, feedback_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("user_id", user.userId);

    if (error) {
      console.error("Feedback error:", error);
      return Response.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
