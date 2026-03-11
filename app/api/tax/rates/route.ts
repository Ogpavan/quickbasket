import { NextRequest, NextResponse } from "next/server";

import { fetchWooTaxRatesByClass } from "@/lib/woocommerce";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toNumber(value?: string) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function POST(request: NextRequest) {
  try {
    const { classes } = (await request.json()) as { classes?: string[] };
    const normalized = Array.from(new Set((classes ?? []).map((value) => value?.trim()).filter(Boolean)));

    if (normalized.length === 0) {
      return NextResponse.json({ rates: {} });
    }

    const entries = await Promise.all(
      normalized.map(async (taxClass) => {
        const rates = await fetchWooTaxRatesByClass(taxClass);
        const bestRate = rates
          .map((rate) => toNumber(rate.rate))
          .filter((rate) => rate > 0)
          .sort((a, b) => b - a)[0];

        return [taxClass, bestRate ?? 0] as const;
      })
    );

    return NextResponse.json({ rates: Object.fromEntries(entries) });
  } catch (error) {
    console.error("Tax rate lookup failed", error);
    return NextResponse.json({ rates: {} }, { status: 500 });
  }
}
