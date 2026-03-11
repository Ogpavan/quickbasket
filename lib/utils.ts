import { GroceryProduct } from "@/types/product";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat(process.env.NEXT_PUBLIC_STORE_LOCALE ?? "en-IN", {
    style: "currency",
    currency: process.env.NEXT_PUBLIC_STORE_CURRENCY ?? "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function matchesSearch(product: GroceryProduct, search: string) {
  if (!search) {
    return true;
  }

  const query = search.toLowerCase().trim();
  const haystack = [product.name, product.brand, product.category, product.weight, product.description]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

const FREE_DELIVERY_THRESHOLD = 499;
const DELIVERY_FEE = 25;

export function calculateCartTotals(subtotal: number) {
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  return {
    subtotal,
    deliveryFee,
    total
  };
}
