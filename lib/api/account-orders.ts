import type { AuthUser } from "@/context/AuthContext";
import type { AccountOrder } from "@/types/order";

export async function loadAccountOrders({
  user,
  signal
}: {
  user: AuthUser;
  signal?: AbortSignal;
}): Promise<AccountOrder[]> {
  if (!user) {
    return [];
  }

  const query = user.phone
    ? `phone=${encodeURIComponent(user.phone)}`
    : `customerId=${user.id ?? ""}`;
  const response = await fetch(`/api/orders?${query}`, {
    cache: "no-store",
    signal
  });

  if (!response.ok) {
    throw new Error("Unable to load orders.");
  }

  const payload = (await response.json()) as { orders?: AccountOrder[]; error?: string };

  if (!payload.orders) {
    throw new Error(payload.error ?? "Unable to load orders.");
  }

  return payload.orders;
}
