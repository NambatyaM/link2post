import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { itemId, field } = await req.json() as {
      itemId: string;
      field: string;
    };

    if (!itemId || !field) {
      return Response.json({ error: "Missing itemId or field" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { error } = await supabase
      .from("copy_events")
      .insert({
        user_id: user.userId,
        calendar_item_id: itemId,
        copied_field: field,
      });

    if (error) {
      console.error("Copy event error:", error);
      return Response.json({ error: "Failed to log copy event" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Copy event error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
