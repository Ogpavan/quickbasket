"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CategoryGrid } from "@/components/CategoryGrid";
import { HeroCarousel } from "@/components/HeroCarousel";
import { OfferBanner } from "@/components/OfferBanner";
import { ProductSection } from "@/components/ProductSection";
import { Reveal } from "@/components/Reveal";
import type { HeroSlide, OfferItem } from "@/lib/catalog";
import type { GroceryCategory, GroceryProduct } from "@/types/product";

interface HomePayload {
  categories: GroceryCategory[];
  popularPicks: GroceryProduct[];
  dailyEssentials: GroceryProduct[];
  heroSlides: HeroSlide[];
  offers: OfferItem[];
}

export default function HomePage() {
  const [data, setData] = useState<HomePayload | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    let isActive = true;

    fetch("/api/home", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as HomePayload & { error?: string };
        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load home data.");
        }
        return result;
      })
      .then((result) => {
        if (isActive) {
          setData(result);
        }
      })
      .catch((fetchError) => {
        if (isActive) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load home data.");
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    router.prefetch("/category/all");
  }, [data, router]);

  if (!data && !error) {
    return (
      <section className="site-container page-section">
        <div className="home-loader">
          <div className="home-loader__ring" />
          <p className="home-loader__text">Loading the homepage…</p>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="site-container page-section">
        <div className="rounded-md border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          {error || "Unable to load the homepage right now."}
        </div>
      </section>
    );
  }

  const { categories, popularPicks, dailyEssentials, heroSlides, offers } = data;

  return (
    <>
      <Reveal delayMs={80}>
        <HeroCarousel slides={heroSlides} />
      </Reveal>
      <Reveal delayMs={140}>
        <CategoryGrid categories={categories} />
      </Reveal>
      <Reveal delayMs={200}>
        <section className="site-container page-section space-y-6">
          <ProductSection title="Popular picks" products={popularPicks} viewAllHref="/category/all" />
          <ProductSection
            title="Daily essentials"
            products={dailyEssentials}
            viewAllHref="/category/all"
            layout="grid"
          />
        </section>
      </Reveal>
      <Reveal delayMs={260}>
        <OfferBanner offers={offers} />
      </Reveal>
    </>
  );
}
