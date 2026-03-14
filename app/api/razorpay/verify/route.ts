import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { createWooOrder, splitCustomerName, upsertWooCustomer } from "@/lib/woocommerce";
import { DeliveryFeeConfig } from "@/lib/delivery";
import { calculateCartTotals } from "@/lib/utils";
import { CartLineItem } from "@/types/product";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RazorpayVerifyPayload {
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
  orderId?: string;
  method?: "upi" | "card";
  checkout?: {
    address?: {
      name?: string;
      phone?: string;
      house_no?: string;
      building_name?: string;
      area?: string;
      landmark?: string;
      address_line?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      postal_code?: string;
    };
    items?: CartLineItem[];
    totals?: {
      subtotal: number;
      deliveryFee: number;
      total: number;
    };
    delivery?: {
      distanceKm?: number;
      feeConfig?: DeliveryFeeConfig | null;
    };
  };
}

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
    const payload = (await request.json()) as RazorpayVerifyPayload;

    const paymentId = payload.razorpay_payment_id?.trim();
    const orderId = payload.orderId?.trim() || payload.razorpay_order_id?.trim();
    const signature = payload.razorpay_signature?.trim();

    if (!paymentId || !orderId || !signature) {
      return NextResponse.json({ error: "Missing payment verification details." }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Razorpay is not configured." }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
    }

    const checkout = payload.checkout;
    const items = checkout?.items ?? [];

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing order details." }, { status: 400 });
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

    const address = checkout?.address ?? {};
    const name = address.name?.trim() ?? "";
    const phone = normalizePhoneNumber(address.phone ?? "");

    if (name.length < 2) {
      return NextResponse.json({ error: "Missing customer name for the order." }, { status: 400 });
    }

    if (phone.length !== 10) {
      return NextResponse.json({ error: "Missing customer phone number for the order." }, { status: 400 });
    }

    const customer = await upsertWooCustomer({
      name,
      phone
    });
    const { firstName, lastName } = splitCustomerName(name);
    const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
    const totals = calculateCartTotals(subtotal, {
      distanceKm: checkout?.delivery?.distanceKm,
      feeConfig: checkout?.delivery?.feeConfig
    });
    const addressLine1 =
      joinParts([address.house_no, address.building_name]) ||
      address.address_line?.trim() ||
      address.area?.trim() ||
      "";
    const addressLine2 = joinParts([address.area, address.landmark]);
    const city = address.city?.trim() || address.area?.trim() || "";
    const state = address.state?.trim() || "NA";
    const postalCode = address.postalCode?.trim() || address.postal_code?.trim() || "000000";
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
    const fixedHandlingFee = totals.handlingFee;
    const handlingFeeTotal = items.reduce((sum, item) => sum + (item.handlingFee ?? 0) * item.quantity, 0);
    const feeLines = [
      ...(fixedHandlingFee > 0
        ? [
            {
              name: "Handling charge",
              total: toMoney(fixedHandlingFee),
              tax_class: "",
              taxable: false
            }
          ]
        : []),
      ...(handlingFeeTotal > 0
        ? [
            {
              name: "Item handling charge",
              total: toMoney(handlingFeeTotal),
              tax_class: "",
              taxable: false
            }
          ]
        : [])
    ];
    const paymentMethod = payload.method === "card" ? "razorpay-card" : "razorpay-upi";
    const paymentTitle = payload.method === "card" ? "Razorpay Card" : "Razorpay UPI";

    const order = await createWooOrder({
      payment_method: paymentMethod,
      payment_method_title: paymentTitle,
      set_paid: true,
      status: "processing",
      customer_id: customer.id,
      billing: {
        first_name: firstName,
        last_name: lastName,
        email: customer.email,
        phone,
        address_1: addressLine1,
        address_2: addressLine2,
        city,
        state,
        postcode: postalCode,
        country: "IN"
      },
      shipping: {
        first_name: firstName,
        last_name: lastName,
        address_1: addressLine1,
        address_2: addressLine2,
        city,
        state,
        postcode: postalCode,
        country: "IN"
      },
      line_items: lineItems,
      shipping_lines: shippingLines,
      ...(feeLines.length > 0
        ? {
            fee_lines: feeLines
          }
        : {}),
      meta_data: [
        {
          key: "quickbasket_source",
          value: "web"
        },
        {
          key: "payment_mode",
          value: paymentMethod
        },
        {
          key: "razorpay_order_id",
          value: orderId
        },
        {
          key: "razorpay_payment_id",
          value: paymentId
        },
        {
          key: "delivery_landmark",
          value: address.landmark || "-"
        }
      ]
    });

    return NextResponse.json({
      verified: true,
      order: {
        id: order.id,
        status: order.status,
        total: Number(order.total || totals.total + handlingFeeTotal),
        paymentMethod: paymentTitle,
        customerName: joinParts([firstName, lastName]) || name,
        phone,
        email: customer.email,
        addressSummary: joinParts([addressLine1, addressLine2, city, state, postalCode])
      }
    });
  } catch (error) {
    console.error("Razorpay order processing failed", error);
    return NextResponse.json({ error: "We could not save the order to WooCommerce right now." }, { status: 500 });
  }
}
