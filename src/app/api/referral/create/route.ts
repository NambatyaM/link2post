import { NextRequest } from "next/server";
import { extractBearerToken, verifyToken } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractBearerToken(req);
    if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const user = await verifyToken(token);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseServer(req);

    const { data: existing } = await supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", user.userId)
      .single();

    if (existing?.code) {
      const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}?ref=${existing.code}`;
      return Response.json({ code: existing.code, link: url });
    }

    let code = generateCode();
    let attempts = 0;
    let saved = false;
    while (attempts < 10) {
      const { error } = await supabase.from("referral_codes").insert({
        user_id: user.userId,
        code,
      });
      if (!error) {
        saved = true;
        break;
      }
      code = generateCode();
      attempts++;
    }

    if (!saved) {
      return Response.json({ error: "Failed to create referral code" }, { status: 500 });
    }

    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}?ref=${code}`;
    return Response.json({ code, link: url });
  } catch (error) {
    console.error("Referral create error:", error);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
