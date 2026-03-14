import { cookies } from "next/headers";

export function getStoreIdFromCookies(): number | undefined {
  try {
    const storeIdRaw = cookies().get("storeId")?.value;
    if (!storeIdRaw) {
      return undefined;
    }
    const parsed = Number.parseInt(storeIdRaw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}
