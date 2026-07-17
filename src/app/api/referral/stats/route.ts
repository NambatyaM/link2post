import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServer(req);

    const { data: codeRow } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", user.userId)
      .single();

    const code = codeRow?.code || null;

    const { count: totalReferrals } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.userId);

    const { count: confirmedReferrals } = await supabase
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", user.userId)
      .eq("status", "confirmed");

    const { data: credits } = await supabase
      .from("user_credits")
      .select("bonus")
      .eq("user_id", user.userId)
      .single();

    return Response.json({
      code,
      totalReferrals: totalReferrals || 0,
      confirmedReferrals: confirmedReferrals || 0,
      bonusRemaining: credits?.bonus || 0,
    });
  } catch (error) {
    console.error("Referral stats error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
