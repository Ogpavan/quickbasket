import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { GroceryProduct } from "@/types/product";

interface HorizontalScrollSectionProps {
  title: string;
  href: string;
  products: GroceryProduct[];
}

export function HorizontalScrollSection({ title, href, products }: HorizontalScrollSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-brand-ink">{title}</h2>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green transition duration-150 hover:text-brand-ink"
        >
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1">
        {products.map((product) => (
          <div key={product.id} className="w-[176px] min-w-[176px] snap-start">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
