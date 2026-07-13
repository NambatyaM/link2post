import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { itemId, feedback, feedbackText } = await req.json() as {
      itemId: string;
      feedback: "up" | "down" | null;
      feedbackText?: string;
    };

    if (!itemId) {
      return Response.json({ error: "Missing itemId" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    if (feedback === null) {
      const { error } = await supabase
        .from("calendar_items")
        .update({ feedback: null, feedback_at: null, feedback_text: null })
        .eq("id", itemId)
        .eq("user_id", user.userId);

      if (error) {
        console.error("Feedback clear error:", error);
        return Response.json({ error: "Failed to clear feedback" }, { status: 500 });
      }
    } else {
      if (feedback !== "up" && feedback !== "down") {
        return Response.json({ error: "Feedback must be 'up', 'down', or null" }, { status: 400 });
      }

      const { error } = await supabase
        .from("calendar_items")
        .update({
          feedback,
          feedback_at: new Date().toISOString(),
          feedback_text: feedback === "down" && feedbackText ? feedbackText.slice(0, 500) : null,
        })
        .eq("id", itemId)
        .eq("user_id", user.userId);

      if (error) {
        console.error("Feedback error:", error);
        return Response.json({ error: "Failed to save feedback" }, { status: 500 });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
