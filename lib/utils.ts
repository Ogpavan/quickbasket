import { DeliveryFeeConfig } from "@/lib/delivery";
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
  if (haystack.includes(query)) {
    return true;
  }

  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return terms.every((term) => haystack.includes(term));
}

export function matchesTitle(product: GroceryProduct, search: string) {
  if (!search) {
    return true;
  }

  const query = search.toLowerCase().trim();
  const name = product.name.toLowerCase();

  if (name.includes(query)) {
    return true;
  }

  const terms = query
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  return terms.every((term) => name.includes(term));
}

const FREE_DELIVERY_THRESHOLD = 499;
const DELIVERY_FEE = 25;

function sanitizeNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function findMatchingSlab(distanceKm: number, slabs: DeliveryFeeConfig["slabs"]) {
  return slabs.find((slab) => distanceKm >= slab.fromKm && distanceKm <= slab.toKm);
}

export type DeliveryBreakdownLine = {
  label: string;
  amount?: number;
  isDiscount?: boolean;
};

export type DeliveryBreakdown = {
  baseFee: number;
  smallCartFee: number;
  surgeAmount: number;
  freeDeliveryDiscount: number;
  capDiscount: number;
  finalFee: number;
  slab?: { fromKm: number; toKm: number };
  lines: DeliveryBreakdownLine[];
};

export function calculateDeliveryBreakdown({
  subtotal,
  distanceKm,
  feeConfig
}: {
  subtotal: number;
  distanceKm?: number;
  feeConfig?: DeliveryFeeConfig | null;
}): DeliveryBreakdown {
  if (subtotal <= 0) {
    return {
      baseFee: 0,
      smallCartFee: 0,
      surgeAmount: 0,
      freeDeliveryDiscount: 0,
      capDiscount: 0,
      finalFee: 0,
      lines: []
    };
  }

  if (!feeConfig || typeof distanceKm !== "number" || !Number.isFinite(distanceKm)) {
    const fallbackFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    return {
      baseFee: fallbackFee,
      smallCartFee: 0,
      surgeAmount: 0,
      freeDeliveryDiscount: 0,
      capDiscount: 0,
      finalFee: fallbackFee,
      lines: []
    };
  }

  const slabs = feeConfig.slabs ?? [];
  const matchingSlab = findMatchingSlab(distanceKm, slabs);
  const baseFee = matchingSlab ? sanitizeNumber(matchingSlab.fee) : 0;

  const smallCartThreshold = sanitizeNumber(feeConfig.smallCartThreshold);
  const smallCartFee = sanitizeNumber(feeConfig.smallCartFee);
  const appliedSmallCartFee = smallCartThreshold > 0 && subtotal < smallCartThreshold ? smallCartFee : 0;

  const preSurgeFee = baseFee + appliedSmallCartFee;
  const surgeMultiplier = sanitizeNumber(feeConfig.surgeMultiplier) || 1;
  const postSurgeFee = preSurgeFee * surgeMultiplier;
  const surgeAmount = postSurgeFee - preSurgeFee;

  const freeThreshold = sanitizeNumber(feeConfig.freeDeliveryThreshold);
  let fee = postSurgeFee;
  let freeDeliveryDiscount = 0;
  if (freeThreshold > 0 && subtotal >= freeThreshold) {
    freeDeliveryDiscount = postSurgeFee;
    fee = 0;
  }

  const maxFee = sanitizeNumber(feeConfig.maxDeliveryFee);
  let capDiscount = 0;
  if (maxFee > 0 && fee > maxFee) {
    capDiscount = fee - maxFee;
    fee = maxFee;
  }

  const lines: DeliveryBreakdownLine[] = [];
  // Base delivery is implicit in the total; don't show as a separate line.

  if (appliedSmallCartFee > 0) {
    lines.push({
      label: "Small cart fee",
      amount: appliedSmallCartFee
    });
  }

  if (surgeAmount > 0) {
    lines.push({
      label: `Surge fee x${surgeMultiplier}`,
      amount: surgeAmount
    });
  }

  if (freeDeliveryDiscount > 0) {
    // Free delivery is reflected in the final fee; omit the line item.
  }

  if (capDiscount > 0) {
    lines.push({
      label: "Max fee discount",
      amount: -capDiscount,
      isDiscount: true
    });
  }

  return {
    baseFee,
    smallCartFee: appliedSmallCartFee,
    surgeAmount,
    freeDeliveryDiscount,
    capDiscount,
    finalFee: Math.max(fee, 0),
    slab: matchingSlab ? { fromKm: matchingSlab.fromKm, toKm: matchingSlab.toKm } : undefined,
    lines
  };
}

export function calculateDeliveryFee({
  subtotal,
  distanceKm,
  feeConfig
}: {
  subtotal: number;
  distanceKm?: number;
  feeConfig?: DeliveryFeeConfig | null;
}) {
  const breakdown = calculateDeliveryBreakdown({ subtotal, distanceKm, feeConfig });
  return breakdown.finalFee;
}

export function calculateCartTotals(
  subtotal: number,
  options?: {
    distanceKm?: number;
    feeConfig?: DeliveryFeeConfig | null;
  }
) {
  const deliveryFee = calculateDeliveryFee({
    subtotal,
    distanceKm: options?.distanceKm,
    feeConfig: options?.feeConfig
  });
  const handlingFee = options?.feeConfig ? sanitizeNumber(options.feeConfig.handlingFee) : 0;
  const deliveryBreakdown = calculateDeliveryBreakdown({
    subtotal,
    distanceKm: options?.distanceKm,
    feeConfig: options?.feeConfig
  });
  const total = subtotal + deliveryFee + handlingFee;

  return {
    subtotal,
    deliveryFee,
    handlingFee,
    deliveryBreakdown,
    total
  };
}
