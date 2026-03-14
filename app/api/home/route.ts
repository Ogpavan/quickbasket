import { NextResponse } from "next/server";

import {
  getCategories,
  getDailyEssentialProducts,
  getHeroSlides,
  getOfferItems,
  getPopularProducts
} from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const [categories, popularPicks, dailyEssentials, heroSlides, offers] = await Promise.all([
      getCategories(),
      getPopularProducts(10),
      getDailyEssentialProducts(10),
      getHeroSlides(3),
      getOfferItems(9)
    ]);

    return NextResponse.json({
      categories,
      popularPicks,
      dailyEssentials,
      heroSlides,
      offers
    });
  } catch (error) {
    console.error("Home data route failed", error);
    return NextResponse.json({ error: "Unable to load home data." }, { status: 500 });
  }
}
