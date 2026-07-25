import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[paddle/webhook] FATAL: PADDLE_WEBHOOK_SECRET not configured");
      return Response.json({ error: "Webhook not configured" }, { status: 503 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature") || "";

    const crypto = await import("node:crypto");
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    if (signature !== expected) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.event_type === "transaction.completed") {
      const customerId = event.data?.customer?.id;
      const email = event.data?.customer?.email;
      const planId = event.data?.items?.[0]?.price?.id;
      const transactionId = event.data?.id;

      if (!customerId || !email || !planId) {
        return Response.json({ success: true, skipped: true });
      }

      const planMap: Record<string, string> = {};
      if (process.env.PADDLE_STARTER_PRICE_ID) planMap[process.env.PADDLE_STARTER_PRICE_ID] = "starter";
      if (process.env.PADDLE_PRO_PRICE_ID) planMap[process.env.PADDLE_PRO_PRICE_ID] = "pro";

      const plan = planMap[planId];
      if (!plan) {
        return Response.json({ success: true, skipped: true });
      }

      const supabase = getSupabaseAdmin();

      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id, paddle_customer_id")
        .eq("paddle_customer_id", customerId)
        .single();

      if (existingProfile) {
        await supabase
          .from("user_profiles")
          .update({ plan, updated_at: new Date().toISOString() })
          .eq("id", existingProfile.id);
      } else {
        const { data: profileByEmail } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (profileByEmail) {
          await supabase
            .from("user_profiles")
            .update({ plan, paddle_customer_id: customerId, updated_at: new Date().toISOString() })
            .eq("id", profileByEmail.id);
        } else {
          await supabase
            .from("user_profiles")
            .upsert({
              email,
              plan,
              paddle_customer_id: customerId,
              updated_at: new Date().toISOString(),
            }, { onConflict: "email" });
        }
      }

      console.log(`[paddle/webhook] Processed ${transactionId}: ${email} -> ${plan}`);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("[paddle/webhook] Error:", err);
    return Response.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
