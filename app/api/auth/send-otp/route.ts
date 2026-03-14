import { NextRequest, NextResponse } from "next/server";

import { OtpServiceError, sendOtpChallenge } from "@/lib/server/otp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
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
    };

    const name = payload.name?.trim() ?? "";
    const phone = normalizePhoneNumber(payload.phone ?? "");
    const isAlphaName = /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(name);

    if (name.length < 2 || !isAlphaName) {
      return NextResponse.json({ error: "Enter a valid full name using alphabets only." }, { status: 400 });
    }

    if (phone.length !== 10) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }

    const challenge = await sendOtpChallenge({
      name,
      phone,
      ipAddress: getClientIpAddress(request),
      userAgent: request.headers.get("user-agent")
    });

    return NextResponse.json(challenge);
  } catch (error) {
    if (error instanceof OtpServiceError) {
      const response = NextResponse.json({ error: error.message }, { status: error.status });

      if (typeof error.retryAfterSeconds === "number") {
        response.headers.set("Retry-After", error.retryAfterSeconds.toString());
      }

      return response;
    }

    console.error("OTP send route failed", error);

    return NextResponse.json(
      {
        error: "We could not send the OTP right now. Please try again."
      },
      { status: 500 }
    );
  }
}
