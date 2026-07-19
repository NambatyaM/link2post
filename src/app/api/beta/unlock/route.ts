import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { unauthorized } from "@/lib/with-auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return unauthorized();
    const user = await verifyToken(token);
    if (!user) return unauthorized();

    const supabase = getSupabaseServer(req, token);
    const { email } = await req.json().catch(() => ({}));

    // Set beta_access flag
    const { error: updateError } = await supabase
      .from("user_profiles")
      .upsert(
        { id: user.userId, beta_access: true, email: email || "" },
        { onConflict: "id" }
      );

    if (updateError) {
      console.error("[beta/unlock] Profile update error:", updateError);
    }

    // Add to waitlist
    if (email) {
      await supabase
        .from("waitlist")
        .upsert(
          { email: email.toLowerCase().trim(), user_id: user.userId, source: "beta_full_access" },
          { onConflict: "email" }
        );
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to unlock" }, { status: 500 });
  }
}
