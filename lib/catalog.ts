import { cache } from "react";

import { categories } from "@/data/categories";
import { groceryProducts } from "@/data/groceryProducts";
import {
  fetchWooProductBySlug,
  fetchWooProductCategories,
  fetchWooProducts,
  fetchWooProductsByCategoryId,
  fetchWooProductsPage,
  fetchWooProductsByTag
} from "@/lib/woocommerce";
import { matchesSearch } from "@/lib/utils";
import { DietType, GroceryCategory, GroceryProduct } from "@/types/product";

export interface HeroSlide {
  title: string;
  href: string;
  image: string;
  theme?: string;
}

export interface OfferItem {
  title: string;
  href: string;
  image: string;
}

export interface SubcategoryItem {
  name: string;
  slug: string;
  image: string;
}

interface ProductFilters {
  categorySlug?: string;
  search?: string;
  brand?: string;
  dietType?: DietType | "";
  maxPrice?: number;
}

interface ProductPageFilters extends ProductFilters {
  page?: number;
  perPage?: number;
}

const ALL_CATEGORY: GroceryCategory = {
  name: "All groceries",
  slug: "all",
  image: categories[0]?.image ?? "",
  theme: "from-yellow-100 via-amber-50 to-white"
};

const FALLBACK_CATEGORY_THEMES = [
  "from-lime-100 via-emerald-50 to-white",
  "from-sky-100 via-cyan-50 to-white",
  "from-orange-100 via-amber-50 to-white",
  "from-rose-100 via-orange-50 to-white",
  "from-yellow-100 via-amber-50 to-white",
  "from-cyan-100 via-sky-50 to-white",
  "from-pink-100 via-rose-50 to-white",
  "from-slate-100 via-zinc-50 to-white"
];

const categoryVisuals = new Map(categories.map((category) => [category.slug, category]));
const CATEGORY_IMAGE_PLACEHOLDER =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
const HERO_THEME_FALLBACK = "from-brand-yellow via-amber-100 to-white";
const COMMERCIAL_TAG = "commercial";
const OFFER_TAG = "offer";
const POPULAR_TAG = "popular";
const DAILY_TAG = "daily";
const CATEGORY_LIMIT = 20;

function isWooCommerceEnabled() {
  return process.env.CATALOG_SOURCE === "woocommerce";
}

const loadProducts = cache(async () => {
  if (isWooCommerceEnabled()) {
    return fetchWooProducts();
  }

  return groceryProducts;
});

const loadWooCategories = cache(async () => fetchWooProductCategories());
const loadWooProductBySlug = cache(async (slug: string) => fetchWooProductBySlug(slug));

export async function getCategories() {
  if (!isWooCommerceEnabled()) {
    return categories;
  }

  const wooCategories = await loadWooCategories();
  const seen = new Set<string>();

  return wooCategories
    .filter((category) => {
      if (category.parent && category.parent !== 0) {
        return false;
      }

      if (!category.slug || seen.has(category.slug)) {
        return false;
      }

      seen.add(category.slug);
      return true;
    })
    .map((category, index) => mapWooCategory(category, index))
    .slice(0, CATEGORY_LIMIT);
}

export async function getCategoryBySlug(slug: string) {
  if (slug === "all") {
    return ALL_CATEGORY;
  }

  if (!isWooCommerceEnabled()) {
    const availableCategories = await getCategories();
    return availableCategories.find((category) => category.slug === slug);
  }

  const allCategories = await loadWooCategories();
  const targetIndex = allCategories.findIndex((category) => category.slug === slug);

  if (targetIndex === -1) {
    return undefined;
  }

  return mapWooCategory(allCategories[targetIndex], targetIndex);
}

export async function getAllCategorySlugs() {
  if (!isWooCommerceEnabled()) {
    return categories.map((category) => category.slug);
  }

  const allCategories = await loadWooCategories();
  const seen = new Set<string>();

  return allCategories
    .map((category) => category.slug)
    .filter((slug) => {
      if (!slug || seen.has(slug)) {
        return false;
      }

      seen.add(slug);
      return true;
    });
}

export async function getSubcategoriesBySlug(slug: string) {
  if (slug === "all" || !isWooCommerceEnabled()) {
    return [] as SubcategoryItem[];
  }

  const allCategories = await loadWooCategories();
  const currentCategory = allCategories.find((category) => category.slug === slug);

  if (!currentCategory) {
    return [] as SubcategoryItem[];
  }

  const parentId =
    currentCategory.parent && currentCategory.parent !== 0 ? currentCategory.parent : currentCategory.id;

  return allCategories
    .filter((category) => category.parent === parentId)
    .filter((category) => (typeof category.count === "number" ? category.count > 0 : true))
    .filter((category) => Boolean(category.image?.src))
    .map((category) => ({
      name: category.name.replace(/&amp;/g, "&"),
      slug: category.slug,
      image: category.image?.src || CATEGORY_IMAGE_PLACEHOLDER
    }));
}

function mapWooCategory(category: { name: string; slug: string; image?: { src?: string } }, index: number) {
  const visual = categoryVisuals.get(category.slug);
  const image = category.image?.src || visual?.image || CATEGORY_IMAGE_PLACEHOLDER;

  return {
    name: category.name.replace(/&amp;/g, "&"),
    slug: category.slug,
    image,
    theme: visual?.theme ?? FALLBACK_CATEGORY_THEMES[index % FALLBACK_CATEGORY_THEMES.length]
  };
}

export async function getProducts(filters: ProductFilters = {}) {
  if (isWooCommerceEnabled() && filters.categorySlug) {
    const categories = await loadWooCategories();
    const category = categories.find((candidate) => candidate.slug === filters.categorySlug);

    if (!category) {
      return [];
    }

    const products = await fetchWooProductsByCategoryId(category.id);

    return products.filter((product) => {
      const brandMatches = !filters.brand || product.brand === filters.brand;
      const dietMatches = !filters.dietType || product.dietType === filters.dietType;
      const priceMatches = typeof filters.maxPrice !== "number" || product.price <= filters.maxPrice;
      const searchMatches = matchesSearch(product, filters.search ?? "");

      return brandMatches && dietMatches && priceMatches && searchMatches;
    });
  }

  const products = await loadProducts();

  return products.filter((product) => {
    const categoryMatches =
      !filters.categorySlug ||
      product.categorySlug === filters.categorySlug ||
      product.categorySlugs?.includes(filters.categorySlug);
    const brandMatches = !filters.brand || product.brand === filters.brand;
    const dietMatches = !filters.dietType || product.dietType === filters.dietType;
    const priceMatches = typeof filters.maxPrice !== "number" || product.price <= filters.maxPrice;
    const searchMatches = matchesSearch(product, filters.search ?? "");

    return categoryMatches && brandMatches && dietMatches && priceMatches && searchMatches;
  });
}

export async function getProductsPage(filters: ProductPageFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.max(1, filters.perPage ?? 24);

  if (isWooCommerceEnabled()) {
    let categoryId: number | undefined;

    if (filters.categorySlug) {
      const categories = await loadWooCategories();
      const category = categories.find((candidate) => candidate.slug === filters.categorySlug);

      if (!category) {
        return [];
      }

      categoryId = category.id;
    }

    const products = await fetchWooProductsPage({
      page,
      perPage,
      search: filters.search,
      categoryId
    });

    return products.filter((product) => {
      const brandMatches = !filters.brand || product.brand === filters.brand;
      const dietMatches = !filters.dietType || product.dietType === filters.dietType;
      const priceMatches = typeof filters.maxPrice !== "number" || product.price <= filters.maxPrice;
      const searchMatches = matchesSearch(product, filters.search ?? "");

      return brandMatches && dietMatches && priceMatches && searchMatches;
    });
  }

  const products = await loadProducts();
  const filtered = products.filter((product) => {
    const categoryMatches =
      !filters.categorySlug ||
      product.categorySlug === filters.categorySlug ||
      product.categorySlugs?.includes(filters.categorySlug);
    const brandMatches = !filters.brand || product.brand === filters.brand;
    const dietMatches = !filters.dietType || product.dietType === filters.dietType;
    const priceMatches = typeof filters.maxPrice !== "number" || product.price <= filters.maxPrice;
    const searchMatches = matchesSearch(product, filters.search ?? "");

    return categoryMatches && brandMatches && dietMatches && priceMatches && searchMatches;
  });

  const start = (page - 1) * perPage;
  return filtered.slice(start, start + perPage);
}

export async function getProductBySlug(slug: string) {
  if (isWooCommerceEnabled()) {
    return loadWooProductBySlug(slug);
  }

  const products = await loadProducts();
  return products.find((product) => product.slug === slug);
}

export async function getFrequentlyBoughtProducts(limit = 10) {
  const products = await loadProducts();
  const featuredProducts = products.filter((product) => product.frequentlyBought);

  return (featuredProducts.length > 0 ? featuredProducts : products).slice(0, limit);
}

export async function getDailyEssentialProducts(limit = 12) {
  const products = isWooCommerceEnabled() ? await fetchWooProductsByTag(DAILY_TAG) : await loadProducts();
  const essentials = isWooCommerceEnabled()
    ? products
    : products.filter((product) => product.tags?.some((tag) => tag.toLowerCase() === DAILY_TAG));

  return essentials.slice(0, limit);
}

export async function getRelatedProducts(product: GroceryProduct, limit = 6) {
  const products = await loadProducts();
  const sameCategory = products.filter(
    (candidate) => candidate.categorySlug === product.categorySlug && candidate.id !== product.id
  );

  if (sameCategory.length >= limit) {
    return sameCategory.slice(0, limit);
  }

  const fallback = products.filter(
    (candidate) =>
      candidate.id !== product.id &&
      !sameCategory.some((sameCategoryProduct) => sameCategoryProduct.id === candidate.id)
  );

  return [...sameCategory, ...fallback].slice(0, limit);
}

function buildHeroSlide(product: GroceryProduct, theme: string): HeroSlide {
  return {
    title: product.name,
    href: `/product/${product.slug}`,
    image: product.image,
    theme
  };
}

export async function getHeroSlides(limit = 3) {
  const [categories, products] = await Promise.all([
    getCategories(),
    isWooCommerceEnabled() ? fetchWooProductsByTag(COMMERCIAL_TAG) : loadProducts()
  ]);
  const themeByCategory = new Map(categories.map((category) => [category.slug, category.theme]));
  const commercial = isWooCommerceEnabled()
    ? products.filter((product) => product.hasImage !== false)
    : products.filter((product) => product.tags?.some((tag) => tag.toLowerCase() === COMMERCIAL_TAG));
  const candidates = commercial;
  const slides: HeroSlide[] = [];
  const usedCategories = new Set<string>();
  const usedProducts = new Set<number>();

  if (candidates.length === 0) {
    return [];
  }

  for (const product of candidates) {
    if (slides.length >= limit) {
      break;
    }

    if (usedProducts.has(product.id)) {
      continue;
    }

    if (product.categorySlug && usedCategories.has(product.categorySlug)) {
      continue;
    }

    const theme = themeByCategory.get(product.categorySlug) ?? HERO_THEME_FALLBACK;
    slides.push(buildHeroSlide(product, theme));
    usedProducts.add(product.id);

    if (product.categorySlug) {
      usedCategories.add(product.categorySlug);
    }
  }

  if (slides.length < limit) {
    for (const product of candidates) {
      if (slides.length >= limit) {
        break;
      }

      if (usedProducts.has(product.id)) {
        continue;
      }

      const theme = themeByCategory.get(product.categorySlug) ?? HERO_THEME_FALLBACK;
      slides.push(buildHeroSlide(product, theme));
      usedProducts.add(product.id);
    }
  }

  return slides;
}

export async function getOfferItems(limit = 12) {
  const products = isWooCommerceEnabled() ? await fetchWooProductsByTag(OFFER_TAG) : await loadProducts();
  const offers = isWooCommerceEnabled()
    ? products
    : products.filter((product) => product.tags?.some((tag) => tag.toLowerCase() === OFFER_TAG));
  const withImages = offers.filter((product) => product.hasImage !== false);
  const items: OfferItem[] = [];

  for (const product of withImages) {
    if (items.length >= limit) {
      break;
    }

    items.push({
      title: product.name,
      href: `/product/${product.slug}`,
      image: product.image
    });
  }

  return items;
}

export async function getPopularProducts(limit = 10) {
  const products = isWooCommerceEnabled() ? await fetchWooProductsByTag(POPULAR_TAG) : await loadProducts();
  const popular = isWooCommerceEnabled()
    ? products
    : products.filter((product) => product.tags?.some((tag) => tag.toLowerCase() === POPULAR_TAG));

  return popular.slice(0, limit);
}

export async function getCategoryFilters(categorySlug: string, search = "") {
  const products = await getProducts({
    categorySlug: categorySlug === "all" ? undefined : categorySlug,
    search
  });

  return {
    brands: Array.from(new Set(products.map((product) => product.brand))).sort((first, second) =>
      first.localeCompare(second)
    ),
    dietTypes: Array.from(new Set(products.map((product) => product.dietType))),
    maxPrice: Math.max(...products.map((product) => product.price), 0)
  };
}
