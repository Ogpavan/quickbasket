 "use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import { GroceryProduct } from "@/types/product";

interface ProductListProps {
  title: string;
  products: GroceryProduct[];
  viewAllHref?: string;
  horizontal?: boolean;
}

export function ProductList({ title, products, viewAllHref, horizontal = false }: ProductListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const visibleProducts = products.filter((product) => product.hasImage !== false);

  const updateScrollState = () => {
    const container = scrollRef.current;

    if (!container) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScroll = container.scrollWidth - container.clientWidth;
    const current = container.scrollLeft;

    setCanScrollLeft(current > 4);
    setCanScrollRight(current < maxScroll - 4);
  };

  const scrollByAmount = (direction: "left" | "right") => {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const distance = Math.min(container.clientWidth * 0.8, 520);
    const delta = direction === "left" ? -distance : distance;

    container.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    updateScrollState();

    const handleResize = () => updateScrollState();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [visibleProducts.length]);

  return (
    <section className="site-container page-section">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="section-title mt-1">{title}</h2>
        </div>
        {viewAllHref ? (
          <Link href={viewAllHref} className="text-sm font-semibold text-brand-ink transition hover:text-brand-muted">
            View all
          </Link>
        ) : null}
      </div>

      {horizontal ? (
        <div className="relative overflow-visible">
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-smooth sm:mx-0 sm:px-0"
          >
            {visibleProducts.map((product) => (
              <div key={product.id} className="w-[160px] min-w-[160px] snap-start sm:w-[180px] sm:min-w-[180px]">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            disabled={!canScrollLeft}
            className="absolute -left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-brand-line bg-white text-brand-ink shadow-card transition hover:border-brand-yellow disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex lg:-left-4"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            disabled={!canScrollRight}
            className="absolute -right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-brand-line bg-white text-brand-ink shadow-card transition hover:border-brand-yellow disabled:cursor-not-allowed disabled:opacity-40 sm:inline-flex lg:-right-4"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
