import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { priceId } = await req.json() as { priceId?: string };

    if (!priceId) {
      return Response.json({ error: "priceId is required" }, { status: 400 });
    }

    const vendorId = process.env.NEXT_PUBLIC_PADDLE_VENDOR_ID;
    if (!vendorId) {
      return Response.json({ error: "Paddle not configured" }, { status: 503 });
    }

    return Response.json({ url: null, useOverlay: true });
  } catch (err) {
    console.error("[paddle/checkout] Error:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
