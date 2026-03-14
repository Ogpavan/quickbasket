import { DeliveryFeeConfig } from "@/lib/delivery";

export type NearestStoreResponse =
  | {
      serviceable: true;
      store: {
        id: number;
        name: string;
        distance: number;
      };
      fees?: DeliveryFeeConfig;
    }
  | {
      serviceable: false;
      store?: undefined;
      fees?: DeliveryFeeConfig;
    };

export async function fetchNearestStore({
  lat,
  lng,
  baseUrl
}: {
  lat: number;
  lng: number;
  baseUrl?: string;
}): Promise<NearestStoreResponse> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng)
  });
  const path = baseUrl
    ? new URL(`/wp-json/store/v1/nearest?${params.toString()}`, baseUrl).toString()
    : `/api/nearest-store?${params.toString()}`;
  const response = await fetch(path, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Nearest store request failed: ${response.status}`);
  }

  const data = (await response.json()) as NearestStoreResponse;
  return data;
}
