import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from("videos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.userId);

    if (error) {
      console.error("Video delete error:", error);
      return Response.json({ error: "Failed to delete video" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Video delete error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
