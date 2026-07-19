import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const supabase = getSupabaseServer();

    // Try to get user ID if authenticated
    let userId: string | null = null;
    try {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      }
    } catch { /* anonymous signup is fine */ }

    const { error } = await supabase
      .from("waitlist")
      .upsert(
        { email: normalized, user_id: userId, source: source || "pricing_page" },
        { onConflict: "email" }
      );

    if (error) {
      console.error("[waitlist] Insert error:", error);
      return Response.json({ error: "Failed to sign up" }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
