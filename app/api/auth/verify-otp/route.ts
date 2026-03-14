import { NextRequest, NextResponse } from "next/server";

import { createAuthToken } from "@/lib/server/auth";
import { OtpServiceError, verifyOtpChallenge } from "@/lib/server/otp";
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

function getClientIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return request.headers.get("x-real-ip")?.trim() ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      phone?: string;
      otp?: string;
      requestId?: string;
    };

    const phone = normalizePhoneNumber(payload.phone ?? "");
    const otp = payload.otp?.trim() ?? "";
    const requestId = payload.requestId?.trim() ?? "";

    if (phone.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }

    if (!requestId) {
      return NextResponse.json({ error: "OTP request ID is missing. Please request a new OTP." }, { status: 400 });
    }

    const verifiedChallenge = await verifyOtpChallenge({
      requestId,
      phone,
      otp,
      ipAddress: getClientIpAddress(request)
    });

    const customer = await upsertWooCustomer({
      name: verifiedChallenge.name,
      phone: verifiedChallenge.phone
    });

    const user = {
      id: customer.id,
      name: resolveDisplayName(customer.first_name, customer.last_name, verifiedChallenge.name),
      phone: customer.billing?.phone ?? verifiedChallenge.phone,
      email: customer.email
    };

    return NextResponse.json({
      user,
      token: createAuthToken(user.id, user.phone)
    });
  } catch (error) {
    if (error instanceof OtpServiceError) {
      const response = NextResponse.json({ error: error.message }, { status: error.status });

      if (typeof error.retryAfterSeconds === "number") {
        response.headers.set("Retry-After", error.retryAfterSeconds.toString());
      }

      return response;
    }

    console.error("OTP verification route failed", error);

    return NextResponse.json(
      {
        error: "We could not save the customer in WooCommerce right now."
      },
      { status: 500 }
    );
  }
}
