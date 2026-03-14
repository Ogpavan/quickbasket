"use client";

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface CategoryScrollerItem {
  slug: string;
  name: string;
  image: string;
}

interface CategoryScrollerProps {
  categories: CategoryScrollerItem[];
  activeSlug?: string;
  className?: string;
}

export function CategoryScroller({ categories, activeSlug, className }: CategoryScrollerProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className={cn("site-container py-3", className)}>
      <div className="hide-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 scroll-smooth sm:mx-0 sm:px-0">
        {categories.map((category) => {
          const isActive = category.slug === activeSlug;

          return (
            <Link
              key={category.slug}
              href={`/category/${category.slug}`}
              className={cn(
                "group flex w-[92px] min-w-[92px] snap-start flex-col items-center gap-2 rounded-md border bg-white px-2 py-2 text-center shadow-card transition duration-150 hover:-translate-y-0.5",
                isActive
                  ? "border-brand-yellow bg-brand-soft"
                  : "border-brand-line hover:border-brand-yellow/60"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-sm bg-brand-cream">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="48px"
                  className="object-cover transition duration-200 group-hover:scale-[1.04]"
                />
              </div>
              <span className="line-clamp-2 text-xs font-medium text-brand-ink">{category.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
