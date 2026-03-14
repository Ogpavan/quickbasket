"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { GroceryProduct } from "@/types/product";

interface ProductSectionProps {
  title: string;
  products: GroceryProduct[];
  viewAllHref?: string;
  className?: string;
  layout?: "scroll" | "grid";
}

export function ProductSection({ title, products, viewAllHref, className, layout = "scroll" }: ProductSectionProps) {
  const visibleProducts = products.filter((product) => product.hasImage !== false);

  if (visibleProducts.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-ink">{title}</h2>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink transition hover:text-brand-green"
          >
            See all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>

      {layout === "grid" ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {visibleProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scroll-smooth sm:mx-0 sm:px-0">
          {visibleProducts.map((product) => (
            <div key={product.id} className="w-[160px] min-w-[160px] snap-start sm:w-[180px] sm:min-w-[180px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
