import { NextRequest, NextResponse } from "next/server";

import { deleteAddress, updateAddress } from "@/lib/server/addresses";
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

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const userId = getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number.parseInt(context.params.id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid address id." }, { status: 400 });
  }

  const deleted = await deleteAddress(userId, id);
  return NextResponse.json({ deleted });
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const userId = getAuthUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number.parseInt(context.params.id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid address id." }, { status: 400 });
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

  const updated = await updateAddress(userId, id, {
    label: payload.label?.trim(),
    name: payload.name?.trim(),
    house_no: payload.house_no?.trim(),
    building_name: payload.building_name?.trim(),
    floor: payload.floor?.trim(),
    area: payload.area?.trim(),
    landmark: payload.landmark?.trim(),
    address_line: payload.address_line?.trim(),
    city: payload.city?.trim(),
    phone: payload.phone?.trim()
  });

  return NextResponse.json({ updated: Boolean(updated) });
}
