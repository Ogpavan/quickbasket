import { NextRequest, NextResponse } from "next/server";

import { createAddress, listAddresses } from "@/lib/server/addresses";
import { verifyAuthToken } from "@/lib/server/auth";

export const runtime = "nodejs";

function getAuthUserId(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return null;
  }
  const payload = verifyAuthToken(token);
  return payload?.sub ?? null;
}

export async function GET(request: NextRequest) {
  const userId = getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await listAddresses(userId);
  return NextResponse.json(addresses);
}

export async function POST(request: NextRequest) {
  const userId = getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    label?: string;
    name?: string;
    house_no?: string;
    building_name?: string;
    floor?: string;
    area?: string;
    landmark?: string;
    address_line?: string;
    city?: string;
    phone?: string;
  };

  const label = payload.label?.trim() || "Home";
  const name = payload.name?.trim() || "";
  const house_no = payload.house_no?.trim() || "";
  const building_name = payload.building_name?.trim() || "";
  const floor = payload.floor?.trim() || "";
  const area = payload.area?.trim() || "";
  const landmark = payload.landmark?.trim() || "";
  const address_line =
    payload.address_line?.trim() ||
    [house_no, building_name, area, landmark].filter(Boolean).join(", ") ||
    null;
  const city = payload.city?.trim() || null;
  const phone = payload.phone?.trim() || null;

  if (!name || !house_no || !building_name || !area || !landmark) {
    return NextResponse.json({ error: "Missing address fields." }, { status: 400 });
  }

  const created = await createAddress(userId, {
    label,
    name,
    house_no,
    building_name,
    floor: floor || null,
    area,
    landmark,
    address_line,
    city: city || null,
    phone
  });
  return NextResponse.json(created, { status: 201 });
}
