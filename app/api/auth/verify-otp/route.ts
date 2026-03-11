import { NextRequest, NextResponse } from "next/server";

import { upsertWooCustomer } from "@/lib/woocommerce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function resolveDisplayName(firstName: string, lastName: string, fallbackName: string) {
  const fullName = `${firstName} ${lastName}`.trim();
  return fullName || fallbackName;
}

function getMasterOtp() {
  return process.env.AUTH_MASTER_OTP ?? process.env.NEXT_PUBLIC_MASTER_OTP ?? "123456";
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      phone?: string;
      otp?: string;
    };

    const name = payload.name?.trim() ?? "";
    const phone = normalizePhoneNumber(payload.phone ?? "");
    const otp = payload.otp?.trim() ?? "";

    if (name.length < 2) {
      return NextResponse.json({ error: "Enter a valid name." }, { status: 400 });
    }

    if (phone.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }

    if (otp !== getMasterOtp()) {
      return NextResponse.json({ error: "Invalid OTP." }, { status: 401 });
    }

    const customer = await upsertWooCustomer({
      name,
      phone
    });

    return NextResponse.json({
      user: {
        id: customer.id,
        name: resolveDisplayName(customer.first_name, customer.last_name, name),
        phone: customer.billing?.phone ?? phone,
        email: customer.email
      }
    });
  } catch (error) {
    console.error("OTP verification route failed", error);

    return NextResponse.json(
      {
        error: "We could not save the customer in WooCommerce right now."
      },
      { status: 500 }
    );
  }
}
