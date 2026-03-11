import { NextRequest, NextResponse } from "next/server";

import { fetchWooCouponByCode } from "@/lib/woocommerce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toNumber(value?: string) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: NextRequest) {
  try {
    const { code, subtotal } = (await request.json()) as {
      code?: string;
      subtotal?: number;
    };

    const normalized = code?.trim() ?? "";
    if (!normalized) {
      return NextResponse.json({ valid: false, message: "Enter a coupon code." }, { status: 400 });
    }

    const coupon = await fetchWooCouponByCode(normalized);
    if (!coupon) {
      return NextResponse.json({ valid: false, message: "Coupon not found." }, { status: 404 });
    }

    if (coupon.status && coupon.status !== "publish") {
      return NextResponse.json({ valid: false, message: "Coupon is not active." }, { status: 400 });
    }

    if (coupon.date_expires) {
      const expiresAt = new Date(coupon.date_expires);
      if (Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        return NextResponse.json({ valid: false, message: "Coupon has expired." }, { status: 400 });
      }
    }

    if (typeof coupon.usage_limit === "number" && typeof coupon.usage_count === "number") {
      if (coupon.usage_limit > 0 && coupon.usage_count >= coupon.usage_limit) {
        return NextResponse.json({ valid: false, message: "Coupon usage limit reached." }, { status: 400 });
      }
    }

    if (typeof subtotal === "number") {
      const minimum = toNumber(coupon.minimum_amount);
      const maximum = toNumber(coupon.maximum_amount);
      if (minimum > 0 && subtotal < minimum) {
        return NextResponse.json(
          { valid: false, message: `Minimum spend is ₹${minimum}.` },
          { status: 400 }
        );
      }
      if (maximum > 0 && subtotal > maximum) {
        return NextResponse.json(
          { valid: false, message: `Maximum spend for this coupon is ₹${maximum}.` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        amount: coupon.amount,
        discountType: coupon.discount_type,
        individualUse: coupon.individual_use ?? false,
        hasRestrictions:
          Boolean(coupon.product_ids?.length) ||
          Boolean(coupon.excluded_product_ids?.length) ||
          Boolean(coupon.product_categories?.length) ||
          Boolean(coupon.excluded_product_categories?.length)
      },
      message: "Coupon applied. Final discount will be calculated at checkout."
    });
  } catch (error) {
    console.error("Coupon validation failed", error);
    return NextResponse.json({ valid: false, message: "Unable to validate the coupon right now." }, { status: 500 });
  }
}
