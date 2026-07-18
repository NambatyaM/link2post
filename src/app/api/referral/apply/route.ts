import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

const BONUS_PER_REFERRAL = 3;

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { code } = await req.json() as { code: string };
    if (!code || code.length < 4) {
      return Response.json({ error: "Invalid referral code" }, { status: 400 });
    }

    const supabase = getSupabaseServer(req, token);

    const { data: codeRow } = await supabase
      .from("referral_codes")
      .select("user_id")
      .eq("code", code.toUpperCase())
      .single();

    if (!codeRow) {
      return Response.json({ error: "Referral code not found" }, { status: 404 });
    }

    if (codeRow.user_id === user.userId) {
      return Response.json({ error: "You cannot refer yourself" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("referrals")
      .select("id")
      .eq("referrer_id", codeRow.user_id)
      .eq("referred_id", user.userId)
      .single();

    if (existing) {
      return Response.json({ ok: true, alreadyApplied: true });
    }

    await supabase.from("referrals").insert({
      referrer_id: codeRow.user_id,
      referred_id: user.userId,
      status: "pending",
    });

    const { error: rpcError } = await supabase.rpc("increment_bonus", {
      p_user_id: codeRow.user_id,
      p_amount: BONUS_PER_REFERRAL,
    });
    if (rpcError) {
      const { data: existingCredits } = await supabase
        .from("user_credits")
        .select("bonus")
        .eq("user_id", codeRow.user_id)
        .single();
      const currentBonus = existingCredits?.bonus || 0;
      await supabase.from("user_credits").upsert({
        user_id: codeRow.user_id,
        bonus: currentBonus + BONUS_PER_REFERRAL,
      }, { onConflict: "user_id" });
    }

    const { data: referredCredits } = await supabase
      .from("user_credits")
      .select("bonus")
      .eq("user_id", user.userId)
      .single();
    const referredBonus = referredCredits?.bonus || 0;
    await supabase.from("user_credits").upsert({
      user_id: user.userId,
      bonus: referredBonus + BONUS_PER_REFERRAL,
    }, { onConflict: "user_id" });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Referral apply error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
