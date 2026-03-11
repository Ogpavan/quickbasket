import { NextRequest, NextResponse } from "next/server";

import { getProductsPage } from "@/lib/catalog";

export const dynamic = "force-dynamic";

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "";
  const search = searchParams.get("search") ?? "";
  const page = parseNumber(searchParams.get("page"), 1);
  const perPage = Math.min(40, parseNumber(searchParams.get("perPage"), 24));
  const categorySlug = category && category !== "all" ? category : undefined;

  const products = await getProductsPage({
    categorySlug,
    search,
    page,
    perPage
  });

  return NextResponse.json({
    products,
    page,
    perPage,
    hasMore: products.length === perPage
  });
}
