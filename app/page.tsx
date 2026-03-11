import { CategoryGrid } from "@/components/CategoryGrid";
import { HeroCarousel } from "@/components/HeroCarousel";
import { OfferBanner } from "@/components/OfferBanner";
import { ProductList } from "@/components/ProductList";
import { Reveal } from "@/components/Reveal";
import {
  getCategories,
  getDailyEssentialProducts,
  getHeroSlides,
  getOfferItems,
  getPopularProducts
} from "@/lib/catalog";

export default async function HomePage() {
  const [categories, popularPicks, dailyEssentials, heroSlides, offers] = await Promise.all([
    getCategories(),
    getPopularProducts(10),
    getDailyEssentialProducts(10),
    getHeroSlides(3),
    getOfferItems(9)
  ]);

  return (
    <>
      <Reveal>
        <HeroCarousel slides={heroSlides} />
      </Reveal>

      <Reveal delayMs={80}>
        <CategoryGrid categories={categories} />
      </Reveal>
      <Reveal delayMs={140}>
        <OfferBanner offers={offers} />
      </Reveal>
      <Reveal delayMs={200}>
        <ProductList title="Popular picks" products={popularPicks} horizontal viewAllHref="/category/all" />
      </Reveal>
      <Reveal delayMs={260}>
        <ProductList title="Daily essentials" products={dailyEssentials} viewAllHref="/category/all" />
      </Reveal>
    </>
  );
}
