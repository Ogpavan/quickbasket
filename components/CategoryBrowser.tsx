"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import { GroceryCategory, GroceryProduct } from "@/types/product";
import type { SubcategoryItem } from "@/lib/catalog";
import { cn } from "@/lib/utils";

interface CategoryBrowserProps {
  category: GroceryCategory;
  products: GroceryProduct[];
  search: string;
  subcategories: SubcategoryItem[];
  pageSize: number;
}

export function CategoryBrowser({
  category,
  products,
  search,
  subcategories,
  pageSize
}: CategoryBrowserProps) {
  const activeSlug = category.slug;
  const router = useRouter();
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [items, setItems] = useState(() => products.filter((product) => product.hasImage !== false));
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(products.length >= pageSize);

  useEffect(() => {
    const storedScroll = window.sessionStorage.getItem("category-page-scroll");
    const storedSidebarScroll = window.sessionStorage.getItem("category-sidebar-scroll");

    if (storedScroll) {
      window.scrollTo({ top: Number(storedScroll), behavior: "auto" });
    }

    if (sidebarRef.current && storedSidebarScroll) {
      window.requestAnimationFrame(() => {
        if (sidebarRef.current) {
          sidebarRef.current.scrollTop = Number(storedSidebarScroll);
        }
      });
    }
  }, [pathname]);

  useEffect(() => {
    setItems(products.filter((product) => product.hasImage !== false));
    setPage(1);
    setHasMore(products.length >= pageSize);
  }, [products, activeSlug, search, pageSize]);

  const handleNavigate = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.sessionStorage.setItem("category-page-scroll", String(window.scrollY));

    if (sidebarRef.current) {
      window.sessionStorage.setItem("category-sidebar-scroll", String(sidebarRef.current.scrollTop));
    }

    router.push(href, { scroll: false });
  };

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);
    const nextPage = page + 1;
    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("perPage", String(pageSize));
    if (search) {
      params.set("search", search);
    }
    params.set("category", activeSlug);

    try {
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load more products");
      }
      const data = await response.json();
      const nextProducts = (data.products ?? []).filter(
        (product: GroceryProduct) => product.hasImage !== false
      );

      setItems((prev) => [...prev, ...nextProducts]);
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error(error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [activeSlug, hasMore, isLoading, page, pageSize, search]);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "500px" }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <section className="site-container page-section space-y-4">
      <div className="grid gap-4 sm:gap-6 grid-cols-[80px_1fr] lg:grid-cols-[100px_1fr]">
        <aside className="sticky top-24">
          <div
            ref={sidebarRef}
            onScroll={() => {
              if (sidebarRef.current) {
                window.sessionStorage.setItem("category-sidebar-scroll", String(sidebarRef.current.scrollTop));
              }
            }}
            className="flex flex-col gap-2 overflow-y-auto h-[calc(100vh-7rem)]"
          >
            {subcategories.map((item) => {
              const isActive = item.slug === activeSlug;

              return (
                <Link
                  key={item.slug}
                  href={`/category/${item.slug}`}
                  scroll={false}
                  onClick={handleNavigate(`/category/${item.slug}`)}
                  className={cn(
                    "relative flex min-w-[64px] flex-col items-center gap-1.5 rounded-xl px-2 py-2 text-center text-[10px] font-normal text-slate-500 transition",
                    "bg-white hover:bg-white",
                    isActive ? "bg-white font-semibold text-brand-ink shadow-sm" : ""
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-brand-green transition-all duration-300",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="relative h-12 w-12 overflow-hidden rounded-lg bg-white">
                    <Image src={item.image} alt={item.name} fill sizes="48px" className="object-contain" />
                  </span>
                  <span className="text-[9px] leading-tight text-slate-500">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        <div className="space-y-5">
          {items.length === 0 ? (
            <div className="surface-panel px-6 py-16 text-center">
              <h2 className="section-title">No groceries match this category</h2>
              <p className="mt-3 text-sm text-slate-500">Try a different category or clear the search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          <div ref={sentinelRef} />
          {isLoading ? (
            <p className="text-center text-xs text-slate-400">Loading more...</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
