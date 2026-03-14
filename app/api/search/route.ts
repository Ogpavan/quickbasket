import { NextRequest, NextResponse } from "next/server";

import { getProducts } from "@/lib/catalog";
import { matchesTitle } from "@/lib/utils";
import type { GroceryProduct } from "@/types/product";
import fs from "node:fs/promises";
import path from "node:path";

let cachedWordpressProducts: GroceryProduct[] | null = null;

async function loadWordpressProducts() {
  if (cachedWordpressProducts) {
    return cachedWordpressProducts;
  }

  const csvPath = path.join(process.cwd(), "blinkit_wordpress_products.csv");
  const raw = await fs.readFile(csvPath, "utf-8");
  const [headerLine, ...lines] = raw.split(/\r?\n/);
  const headers = headerLine.split(",").map((value) => value.trim());

  const rows = lines
    .filter(Boolean)
    .map((line) => {
      const values = line.split(",");
      const entry: Record<string, string> = {};
      headers.forEach((key, index) => {
        entry[key] = values[index] ?? "";
      });

      const priceValue = Number(entry.price || entry.regular_price || 0);

      return {
        id: Number(entry.product_id) || Date.now(),
        name: entry.name || "Unknown product",
        slug: entry.slug || `${entry.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ?? "product"}`,
        price: Number.isFinite(priceValue) ? priceValue : 0,
        weight: entry.unit || "1 pc",
        image: entry.image_url || "",
        category: entry.category || "Groceries",
        categorySlug: entry.category_slug || "groceries",
        brand: entry.name?.split(" ")[0] || "QuickBasket",
        stock: entry.in_stock?.toLowerCase() === "yes" ? 20 : 0,
        dietType: "veg",
        description: entry.category || "",
        hasImage: Boolean(entry.image_url)
      } satisfies GroceryProduct;
    })
    .filter((product) => Boolean(product.name));

  cachedWordpressProducts = rows;
  return rows;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "6");
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 12) : 6;
    const [products, wordpressProducts] = await Promise.all([
      getProducts({ search: query }),
      loadWordpressProducts()
    ]);

    const combined = [...products, ...wordpressProducts];
    const dedupedMap = new Map<string, GroceryProduct>();
    for (const product of combined) {
      const key = product.slug?.trim() || product.id.toString();
      if (!key) {
        continue;
      }
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, product);
      }
    }

    const filtered = Array.from(dedupedMap.values()).filter((product) => matchesTitle(product, query));
    return NextResponse.json(
      {
        results: filtered.slice(0, limit)
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Search route failed", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
