"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface CategorySidebarItem {
  slug: string;
  name: string;
  image: string;
}

interface CategorySidebarProps {
  items: CategorySidebarItem[];
  activeSlug: string;
  orientation?: "vertical" | "horizontal";
}

export function CategorySidebar({ items, activeSlug, orientation = "vertical" }: CategorySidebarProps) {
  const router = useRouter();
  const isHorizontal = orientation === "horizontal";

  return (
    <nav
        className={cn(
          isHorizontal
        ? "flex gap-1.5 overflow-x-auto py-1"
        : "native-scrollbar sticky top-0 flex h-full w-[90px] flex-col gap-1.5 overflow-y-scroll border-r border-brand-line bg-white px-0.5 lg:px-2 py-3"
        )}
      aria-label="Categories"
    >
      {items.map((item) => {
        const isActive = item.slug === activeSlug;

        return (
          <Link
            key={item.slug}
            href={`/category/${item.slug}`}
            onMouseEnter={() => router.prefetch(`/category/${item.slug}`)}
            className={cn(
              "group flex shrink-0 flex-col items-center justify-start gap-0.5 border pt-1 text-center transition duration-150 hover:bg-slate-50",
              isHorizontal
                ? "w-[87px] min-w-[87px] border-brand-line"
                : "w-full border-transparent",
              isActive ? "border-brand-green/30 shadow-sm" : ""
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <div className="flex h-14 w-14 items-start justify-center overflow-hidden rounded-md">
              <Image
                src={item.image}
                alt={item.name}
                width={56}
                height={56}
                className={cn(
                  "h-[92%] w-full object-cover object-top transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.01]",
                  isActive ? "scale-100" : ""
                )}
              />
            </div>
              <p
                className={cn(
                  "mt-0.5 line-clamp-2 w-full text-[10px] leading-3",
                  isActive ? "font-medium text-brand-ink" : "font-normal text-slate-500"
                )}
              >
              {item.name}
            </p>
          </Link>
        );
      })}
    </nav>
  );
}
