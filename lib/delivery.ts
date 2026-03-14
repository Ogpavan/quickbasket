
export interface DeliveryFeeSlab {
  fromKm: number;
  toKm: number;
  fee: number;
}

export interface DeliveryFeeConfig {
  storeRadiusKm: number;
  smallCartThreshold: number;
  smallCartFee: number;
  surgeMultiplier: number;
  freeDeliveryThreshold: number;
  handlingFee: number;
  maxDeliveryFee: number;
  slabs: DeliveryFeeSlab[];
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSlabs(value: unknown): DeliveryFeeSlab[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const slabs = value
    .map((row) => {
      if (!row || typeof row !== "object") {
        return null;
      }
      const record = row as Record<string, unknown>;
      const fromKm = toNumber(record.from_km ?? record.fromKm ?? record.from);
      const toKm = toNumber(record.to_km ?? record.toKm ?? record.to);
      const fee = toNumber(record.fee ?? record.amount);

      if (fromKm === null || toKm === null || fee === null) {
        return null;
      }
      if (fromKm < 0 || toKm <= fromKm || fee < 0) {
        return null;
      }

      return {
        fromKm,
        toKm,
        fee
      } as DeliveryFeeSlab;
    })
    .filter(Boolean) as DeliveryFeeSlab[];

  slabs.sort((a, b) => (a.fromKm === b.fromKm ? a.toKm - b.toKm : a.fromKm - b.fromKm));
  return slabs;
}

export function normalizeDeliveryFeeConfig(value: unknown): DeliveryFeeConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const storeRadiusKm = toNumber(record.store_radius_km ?? record.storeRadiusKm);
  const smallCartThreshold = toNumber(record.small_cart_threshold ?? record.smallCartThreshold);
  const smallCartFee = toNumber(record.small_cart_fee ?? record.smallCartFee);
  const surgeMultiplier = toNumber(record.surge_multiplier ?? record.surgeMultiplier);
  const freeDeliveryThreshold = toNumber(record.free_delivery_threshold ?? record.freeDeliveryThreshold);
  const handlingFee = toNumber(record.handling_fee ?? record.handlingFee);
  const maxDeliveryFee = toNumber(record.max_delivery_fee ?? record.maxDeliveryFee);
  const slabs = normalizeSlabs(record.slabs);

  if (
    storeRadiusKm === null &&
    smallCartThreshold === null &&
    smallCartFee === null &&
    surgeMultiplier === null &&
    freeDeliveryThreshold === null &&
    handlingFee === null &&
    maxDeliveryFee === null &&
    slabs.length === 0
  ) {
    return null;
  }

  return {
    storeRadiusKm: Math.max(storeRadiusKm ?? 0, 0),
    smallCartThreshold: Math.max(smallCartThreshold ?? 0, 0),
    smallCartFee: Math.max(smallCartFee ?? 0, 0),
    surgeMultiplier: Math.max(surgeMultiplier ?? 0, 0),
    freeDeliveryThreshold: Math.max(freeDeliveryThreshold ?? 0, 0),
    handlingFee: Math.max(handlingFee ?? 0, 0),
    maxDeliveryFee: Math.max(maxDeliveryFee ?? 0, 0),
    slabs
  };
}
