import { NextRequest, NextResponse } from "next/server";

import { getProductBySlug, getRelatedProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Missing product slug." }, { status: 400 });
  }

  const product = await getProductBySlug(slug);

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const relatedProducts = await getRelatedProducts(product, 6);

  return NextResponse.json({
    product,
    relatedProducts
  });
}
