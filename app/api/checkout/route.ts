import { NextRequest, NextResponse } from "next/server";

import { createWooOrder, splitCustomerName, upsertWooCustomer } from "@/lib/woocommerce";
import { calculateCartTotals } from "@/lib/utils";
import { CheckoutPayload } from "@/types/checkout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function toMoney(value: number) {
  return value.toFixed(2);
}

function joinParts(parts: Array<string | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as CheckoutPayload;
    const name = payload.customer?.name?.trim() ?? "";
    const phone = normalizePhoneNumber(payload.customer?.phone ?? "");
    const addressLine1 = payload.address?.addressLine1?.trim() ?? "";
    const addressLine2 = payload.address?.addressLine2?.trim() ?? "";
    const landmark = payload.address?.landmark?.trim() ?? "";
    const city = payload.address?.city?.trim() ?? "";
    const state = payload.address?.state?.trim() ?? "";
    const postalCode = payload.address?.postalCode?.trim() ?? "";
    const notes = payload.notes?.trim() ?? "";
    const items = payload.items ?? [];

    if (name.length < 2) {
      return NextResponse.json({ error: "Enter a valid full name." }, { status: 400 });
    }

    if (phone.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }

    if (!addressLine1 || !city || !state || !postalCode) {
      return NextResponse.json({ error: "Complete the delivery address before placing the order." }, { status: 400 });
    }

    if (!/^\d{6}$/.test(postalCode)) {
      return NextResponse.json({ error: "Enter a valid 6-digit pincode." }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
    }

    const invalidItem = items.find(
      (item) =>
        typeof item.productId !== "number" ||
        typeof item.quantity !== "number" ||
        item.quantity <= 0 ||
        typeof item.price !== "number"
    );

    if (invalidItem) {
      return NextResponse.json({ error: "One or more cart items are invalid." }, { status: 400 });
    }

    const customer = await upsertWooCustomer({
      name,
      phone
    });
    const { firstName, lastName } = splitCustomerName(name);
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const totals = calculateCartTotals(subtotal);
    const addressLine2Combined = joinParts([addressLine2, landmark]);
    const lineItems = items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      subtotal: toMoney(item.price * item.quantity),
      total: toMoney(item.price * item.quantity),
      meta_data: [
        {
          key: "Pack Size",
          value: item.weight
        },
        {
          key: "Brand",
          value: item.brand
        },
        {
          key: "Image",
          value: item.image
        }
      ]
    }));
    const shippingLines =
      totals.deliveryFee > 0
        ? [
            {
              method_id: "flat_rate",
              method_title: "Quick Delivery",
              total: toMoney(totals.deliveryFee)
            }
          ]
        : [];
    const order = await createWooOrder({
      payment_method: "cod",
      payment_method_title: "Cash on Delivery",
      set_paid: false,
      status: "processing",
      customer_id: customer.id,
      billing: {
        first_name: firstName,
        last_name: lastName,
        email: customer.email,
        phone,
        address_1: addressLine1,
        address_2: addressLine2Combined,
        city,
        state,
        postcode: postalCode,
        country: "IN"
      },
      shipping: {
        first_name: firstName,
        last_name: lastName,
        address_1: addressLine1,
        address_2: addressLine2Combined,
        city,
        state,
        postcode: postalCode,
        country: "IN"
      },
      line_items: lineItems,
      shipping_lines: shippingLines,
      customer_note: notes,
      meta_data: [
        {
          key: "quickbasket_source",
          value: "web"
        },
        {
          key: "payment_mode",
          value: "cash-on-delivery"
        },
        {
          key: "delivery_landmark",
          value: landmark || "-"
        }
      ]
    });

    return NextResponse.json({
      order: {
        id: order.id,
        status: order.status,
        total: Number(order.total || totals.total),
        paymentMethod: "Cash on Delivery",
        customerName: joinParts([firstName, lastName]) || name,
        phone,
        email: customer.email,
        addressSummary: joinParts([addressLine1, addressLine2, landmark, city, state, postalCode])
      }
    });
  } catch (error) {
    console.error("Checkout route failed", error);

    return NextResponse.json(
      {
        error: "We could not save the order to WooCommerce right now."
      },
      { status: 500 }
    );
  }
}
