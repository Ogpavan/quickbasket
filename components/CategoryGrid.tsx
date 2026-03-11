import Image from "next/image";
import Link from "next/link";

import { GroceryCategory } from "@/types/product";

interface CategoryGridProps {
  categories: GroceryCategory[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="site-container page-section">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">Shop by aisle</h2>
        <Link href="/category/all" className="text-sm font-semibold text-brand-green transition hover:text-brand-ink">
          View all
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-3 lg:grid-cols-10">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="group overflow-hidden rounded-lg bg-white transition duration-300 hover:-translate-y-1 hover:shadow-card"
          >
            <div className="relative mx-auto aspect-[109.4/160.88235294117646] w-11/12 overflow-hidden rounded-none bg-white/70">
              <Image
                src={category.image}
                alt={category.name}
                fill
                sizes="(max-width: 1024px) 25vw, 12vw"
                className="object-fill transition duration-500 group-hover:scale-105"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
