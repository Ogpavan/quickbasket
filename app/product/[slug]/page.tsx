"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { ProductDetailPanel } from "@/components/ProductDetailPanel";
import { ProductSection } from "@/components/ProductSection";
import { GroceryProduct } from "@/types/product";

interface ProductResponse {
  product: GroceryProduct;
  relatedProducts: GroceryProduct[];
}

function ProductPageSkeleton() {
  return (
    <>
      <section className="site-container page-section">
        <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-md border border-brand-line bg-white p-4 sm:p-6 shadow-card">
            <div className="aspect-square w-full rounded-md bg-slate-100" />
          </div>

          <div className="rounded-md border border-brand-line bg-white p-5 sm:p-7 shadow-card">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-3 w-24 rounded-full bg-slate-100" />
                <div className="h-7 w-10/12 rounded-md bg-slate-100" />
                <div className="h-4 w-7/12 rounded-md bg-slate-100" />
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="h-7 w-28 rounded-md bg-slate-100" />
                <div className="h-4 w-32 rounded-md bg-slate-100" />
              </div>

              <div className="space-y-3 border-t border-brand-line/60 pt-5">
                <div className="h-4 w-24 rounded-md bg-slate-100" />
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={`size-${index}`} className="h-9 w-20 rounded-md bg-slate-100" />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-brand-line/60 pt-5 sm:flex-row sm:items-end">
                <div className="space-y-2">
                  <div className="h-4 w-20 rounded-md bg-slate-100" />
                  <div className="h-10 w-28 rounded-md bg-slate-100" />
                </div>
                <div className="flex-1 sm:min-w-[220px] sm:self-end">
                  <div className="mb-2 h-4 w-32 rounded-md bg-slate-100" />
                  <div className="h-12 w-full rounded-md bg-slate-100" />
                </div>
              </div>

              <div className="rounded-md border border-brand-line bg-white px-4 py-4">
                <div className="h-3 w-40 rounded-full bg-slate-100" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full rounded-full bg-slate-100" />
                  <div className="h-3 w-10/12 rounded-full bg-slate-100" />
                  <div className="h-3 w-9/12 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="site-container page-section">
        <div className="mb-4 h-6 w-40 rounded-md bg-slate-100" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`related-${index}`} className="surface-panel rounded-md p-2.5">
              <div className="rounded-md bg-slate-100">
                <div className="aspect-square w-full" />
              </div>
              <div className="mt-3 h-4 w-16 rounded-full bg-slate-100" />
              <div className="mt-2 h-4 w-11/12 rounded-full bg-slate-100" />
              <div className="mt-2 h-4 w-8/12 rounded-full bg-slate-100" />
              <div className="mt-4 h-10 w-full rounded-md bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function ProductPage() {
  const params = useParams();
  const slug = useMemo(() => {
    const value = params?.slug;
    return Array.isArray(value) ? value[0] : value;
  }, [params]);

  const [product, setProduct] = useState<GroceryProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<GroceryProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError("");

    fetch(`/api/product/${slug}`)
      .then(async (response) => {
        if (!response.ok) {
          const message = response.status === 404 ? "Product not found." : "Unable to load product.";
          throw new Error(message);
        }
        return (await response.json()) as ProductResponse;
      })
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setProduct(data.product);
        setRelatedProducts(data.relatedProducts ?? []);
      })
      .catch((fetchError) => {
        if (!isMounted) {
          return;
        }
        setProduct(null);
        setRelatedProducts([]);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load product.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (isLoading) {
    return <ProductPageSkeleton />;
  }

  if (error || !product) {
    return (
      <section className="site-container page-section">
        <div className="surface-panel px-6 py-16 text-center">
          <h1 className="page-title">Product unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error || "This product could not be found."}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <ProductDetailPanel product={product} />
      <section className="site-container page-section">
        <ProductSection title="You may also like" products={relatedProducts} viewAllHref={`/category/${product.categorySlug}`} />
      </section>
    </>
  );
}
