import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import { storeMemory, stubEmbedding } from "@/lib/brand-voice";

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = req.nextUrl.searchParams.get("content_type");
    const supabase = getSupabaseServer();

    let query = supabase
      .from("brand_voice_memories")
      .select("id, content_type, content_text, metadata, created_at")
      .eq("user_id", user.userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (contentType) {
      query = query.eq("content_type", contentType);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Brand voice GET error:", error);
      return Response.json({ error: "Failed to fetch memories" }, { status: 500 });
    }

    return Response.json({ memories: data });
  } catch (error) {
    console.error("Brand voice GET error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { contentType, contentText, metadata } = (await req.json()) as {
      contentType: string;
      contentText: string;
      metadata?: Record<string, unknown>;
    };

    if (!contentType || !contentText) {
      return Response.json({ error: "contentType and contentText are required" }, { status: 400 });
    }

    const embedding = stubEmbedding(contentText);
    const memory = await storeMemory(user.userId, contentType, contentText, embedding, metadata ?? {});

    return Response.json({ memory }, { status: 201 });
  } catch (error) {
    console.error("Brand voice POST error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = (await req.json()) as { id: string };
    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("brand_voice_memories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.userId);

    if (error) {
      console.error("Brand voice DELETE error:", error);
      return Response.json({ error: "Failed to delete memory" }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Brand voice DELETE error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
