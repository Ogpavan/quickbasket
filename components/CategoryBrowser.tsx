"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { CategorySidebar } from "@/components/CategorySidebar";
import { ProductSection } from "@/components/ProductSection";
import { ProductCard } from "@/components/ProductCard";
import { fetchProductsPage } from "@/lib/api/products";
import type { CategoryPreviewSection, SubcategoryItem } from "@/lib/catalog";
import type { GroceryCategory, GroceryProduct } from "@/types/product";

interface CategoryBrowserProps {
  category: GroceryCategory;
  products: GroceryProduct[];
  search: string;
  railCategories: SubcategoryItem[];
  sections: CategoryPreviewSection[];
  pageSize: number;
}

function ProductCardSkeleton() {
  return (
    <div className="surface-panel rounded-md p-2.5">
      <div className="rounded-md bg-slate-100">
        <div className="aspect-square w-full" />
      </div>
      <div className="mt-3 h-4 w-16 rounded-full bg-slate-100" />
      <div className="mt-2 h-4 w-11/12 rounded-full bg-slate-100" />
      <div className="mt-2 h-4 w-8/12 rounded-full bg-slate-100" />
      <div className="mt-4 h-10 w-full rounded-md bg-slate-100" />
    </div>
  );
}

export function CategoryBrowser({
  category,
  products,
  search,
  railCategories,
  sections,
  pageSize
}: CategoryBrowserProps) {
  const initialItems = useMemo(() => products.filter((product) => product.hasImage !== false), [products]);
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(products.length >= pageSize);

  useEffect(() => {
    setItems(initialItems);
    setPage(1);
    setHasMore(products.length >= pageSize);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [initialItems, products.length, pageSize, category.slug, search]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) {
      return;
    }

    setIsLoading(true);

    try {
      const nextPage = page + 1;
      const data = await fetchProductsPage({
        category: category.slug,
        page: nextPage,
        perPage: pageSize,
        search
      });

      const nextProducts = (data.products ?? []).filter((product) => product.hasImage !== false);
      setItems((current) => [...current, ...nextProducts]);
      setPage(nextPage);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error(error);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [category.slug, hasMore, isLoading, page, pageSize, search]);

  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || !hasMore) {
        return;
      }

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

      if (maxScroll <= 0) {
        return;
      }

      const scrolledRatio = window.scrollY / maxScroll;

      if (scrolledRatio >= 0.6) {
        loadMore();
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [hasMore, isLoading, loadMore]);

  return (
    <section className="page-section space-y-5">
      <div className="site-container">
        <div className="flex h-[80vh] gap-4 overflow-hidden">
          <div className="h-full shrink-0 overflow-y-auto">
            <CategorySidebar items={railCategories} activeSlug={category.slug} />
          </div>

          <div className="min-w-0 flex-1 space-y-6 overflow-y-auto pr-1">
            {items.length === 0 ? (
              <div className="surface-panel px-6 py-16 text-center">
                <h2 className="section-title">No groceries match this category</h2>
                <p className="mt-2 text-sm text-brand-muted">Try another category or change your search.</p>
              </div>
            ) : (
              <section>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}

                  {isLoading
                    ? Array.from({ length: 6 }).map((_, index) => <ProductCardSkeleton key={`loading-${index}`} />)
                    : null}
                </div>
              </section>
            )}

            {sections.map((section) => (
              <ProductSection
                key={section.slug}
                title={section.name}
                viewAllHref={section.href}
                products={section.products}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
