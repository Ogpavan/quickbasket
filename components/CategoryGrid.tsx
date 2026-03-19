"use client";

import Image from "next/image";
import Link from "next/link";

import type { GroceryCategory } from "@/types/product";

interface CategoryGridProps {
  categories: GroceryCategory[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <section className="site-container page-section">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title">Shop by aisle</h2>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 lg:grid-cols-10">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="group overflow-hidden rounded-sm bg-white transition duration-300 hover:-translate-y-1 hover:shadow-card"
          >
                <div className="relative mx-auto overflow-hidden rounded-none bg-white/70">
                  <Image
                    src={category.image}
                    alt={category.name}
                    width={240}
                    height={352}
                    sizes="(max-width: 640px) 70vw, (max-width: 1024px) 25vw, 12vw"
                    className="h-auto w-full object-contain transition duration-500 group-hover:scale-105"
                  />
                </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
