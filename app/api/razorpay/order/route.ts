import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      amount?: number;
      currency?: string;
      receipt?: string;
      notes?: Record<string, string>;
    };

    const amount = toNumber(payload.amount);
    const currency = (payload.currency ?? "INR").toUpperCase();
    const receipt = payload.receipt?.trim() || `QB-${Date.now()}`;

    if (!amount || amount < 1) {
      return NextResponse.json({ error: "Invalid order amount." }, { status: 400 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        payment_capture: 1,
        notes: payload.notes ?? {}
      })
    });

    const result = (await response.json()) as {
      id?: string;
      amount?: number;
      currency?: string;
      error?: { description?: string };
    };

    if (!response.ok || !result.id) {
      return NextResponse.json(
        { error: result.error?.description ?? "Unable to create Razorpay order." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: result.id,
      amount: result.amount,
      currency: result.currency ?? currency
    });
  } catch (error) {
    console.error("Razorpay order route failed", error);
    return NextResponse.json({ error: "Unable to create Razorpay order." }, { status: 500 });
  }
}
