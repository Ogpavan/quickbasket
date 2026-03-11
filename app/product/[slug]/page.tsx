import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetailPanel } from "@/components/ProductDetailPanel";
import { ProductList } from "@/components/ProductList";
import { getProductBySlug, getProducts, getRelatedProducts } from "@/lib/catalog";

export async function generateStaticParams() {
  const products = await getProducts();

  return products.map((product) => ({
    slug: product.slug
  }));
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    return {
      title: "Product Not Found | QuickBasket"
    };
  }

  return {
    title: `${product.name} | QuickBasket`,
    description: product.description
  };
}

export default async function ProductPage({
  params
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(product, 6);

  return (
    <>
      <ProductDetailPanel product={product} />
      <ProductList title="You may also like" products={relatedProducts} horizontal viewAllHref={`/category/${product.categorySlug}`} />
    </>
  );
}
