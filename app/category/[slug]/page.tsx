import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CategoryBrowser } from "@/components/CategoryBrowser";
import {
  getAllCategorySlugs,
  getCategoryBySlug,
  getCategoryPreviewSections,
  getCategories,
  getProductsPage,
  getSubcategoriesBySlug
} from "@/lib/catalog";

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs();

  return [{ slug: "all" }, ...slugs.map((slug) => ({ slug }))];
}

export async function generateMetadata({
  params
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryBySlug(params.slug);

  if (!category) {
    return {
      title: "Category Not Found | QuickBasket"
    };
  }

  return {
    title: `${category.name} | QuickBasket`,
    description: `Browse ${category.name.toLowerCase()} with fast grocery delivery and quick add-to-cart flow.`
  };
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const category = await getCategoryBySlug(params.slug);

  if (!category) {
    notFound();
  }

  const search = getSearchValue(searchParams.search);
  const pageSize = 30;
  const [products, subcategories, categories] = await Promise.all([
    getProductsPage({
      categorySlug: params.slug === "all" ? undefined : params.slug,
      search,
      page: 1,
      perPage: pageSize
    }),
    getSubcategoriesBySlug(params.slug),
    getCategories()
  ]);
  const railCategories = (subcategories.length > 0 ? subcategories : categories).filter((item) => Boolean(item.image));
  const previewSlugs =
    params.slug === "all"
      ? railCategories.map((item) => item.slug)
      : [...railCategories.map((item) => item.slug).filter((slug) => slug !== params.slug), params.slug];
  const sections = await getCategoryPreviewSections(previewSlugs, {
    perSection: 10,
    maxSections: 5
  });

  return (
    <CategoryBrowser
      category={category}
      products={products}
      search={search}
      railCategories={railCategories}
      sections={sections}
      pageSize={pageSize}
    />
  );
}
