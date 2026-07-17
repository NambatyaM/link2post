import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature") || "";

    if (process.env.PADDLE_WEBHOOK_SECRET) {
      const crypto = await import("node:crypto");
      const expected = crypto
        .createHmac("sha256", process.env.PADDLE_WEBHOOK_SECRET)
        .update(rawBody)
        .digest("hex");
      if (signature !== expected) {
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);

    if (event.event_type === "transaction.completed") {
      const email = event.data?.customer?.email;
      const planId = event.data?.items?.[0]?.price?.id;

      if (email && planId) {
        const planMap: Record<string, string> = {};
        if (process.env.PADDLE_STARTER_PRICE_ID) planMap[process.env.PADDLE_STARTER_PRICE_ID] = "starter";
        if (process.env.PADDLE_PRO_PRICE_ID) planMap[process.env.PADDLE_PRO_PRICE_ID] = "pro";

        const plan = planMap[planId];
        if (plan) {
          const supabase = getSupabaseServer(req);
          await supabase
            .from("user_profiles")
            .upsert({ email, plan, updated_at: new Date().toISOString() }, { onConflict: "email" });
        }
      }
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[paddle/webhook] Error:", err);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
