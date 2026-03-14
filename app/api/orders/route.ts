import { NextRequest, NextResponse } from "next/server";

import {
  buildPlaceholderEmail,
  fetchWooOrdersForCustomerWithItems,
  fetchWooOrdersPageWithItems,
  fetchWooOrdersWithItems,
  findWooCustomerByEmail,
  type WooOrderWithItems
} from "@/lib/woocommerce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const customerIdParam = request.nextUrl.searchParams.get("customerId");
    const phoneParam = request.nextUrl.searchParams.get("phone");
    const emailParam = request.nextUrl.searchParams.get("email");

    let customerId = customerIdParam ? Number(customerIdParam) : null;

    if (!Number.isInteger(customerId) || (customerId ?? 0) <= 0) {
      customerId = null;
    }

    const normalizedPhone = phoneParam ? phoneParam.replace(/\D/g, "") : "";
    const normalizedEmail = emailParam?.trim().toLowerCase() || (normalizedPhone ? buildPlaceholderEmail(normalizedPhone).toLowerCase() : "");

    if (!customerId) {
      if (normalizedEmail) {
        const customer = await findWooCustomerByEmail(normalizedEmail);
        if (customer?.id) {
          customerId = customer.id;
        }
      }
    }

    let orders: WooOrderWithItems[] = [];
    if (customerId) {
      orders = await fetchWooOrdersForCustomerWithItems(customerId);
    } else if (normalizedPhone || normalizedEmail) {
      const perPage = 100;
      const maxPages = 5;
      const matchedOrders: WooOrderWithItems[] = [];

      for (let page = 1; page <= maxPages; page += 1) {
        const pageOrders = page === 1 ? await fetchWooOrdersWithItems(perPage) : await fetchWooOrdersPageWithItems({ page, perPage });
        if (!pageOrders.length) {
          break;
        }

        const filtered = pageOrders.filter((order) => {
          const billingEmail = order.billing?.email?.toLowerCase() ?? "";
          const billingPhone = order.billing?.phone?.replace(/\D/g, "") ?? "";
          return (
            (normalizedEmail && billingEmail === normalizedEmail) ||
            (normalizedPhone && billingPhone === normalizedPhone)
          );
        });

        matchedOrders.push(...filtered);

        if (pageOrders.length < perPage) {
          break;
        }
      }

      orders = matchedOrders;
    }

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Orders route failed", error);
    return NextResponse.json({ error: "Could not fetch orders" }, { status: 500 });
  }
}
