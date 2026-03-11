import { NextRequest, NextResponse } from "next/server";

import { fetchWooOrdersForCustomerWithItems } from "@/lib/woocommerce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const customerIdParam = request.nextUrl.searchParams.get("customerId");

    if (!customerIdParam) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }

    const customerId = Number(customerIdParam);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json({ error: "customerId must be a positive integer" }, { status: 400 });
    }

    const orders = await fetchWooOrdersForCustomerWithItems(customerId);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders route failed", error);
    return NextResponse.json({ error: "Could not fetch orders" }, { status: 500 });
  }
}
