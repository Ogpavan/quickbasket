"use client";

import { useCallback } from "react";

import { useDeliveryCoords } from "@/context/DeliveryContext";
import { fetchNearestStore, type NearestStoreResponse } from "@/lib/store-api";

const STORE_ID_KEY = "storeId";

function setStoreCookie(storeId: number) {
  document.cookie = `${STORE_ID_KEY}=${storeId}; Path=/; SameSite=Lax`;
}

function clearStoreCookie() {
  document.cookie = `${STORE_ID_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function useNearestStore({ apiBaseUrl }: { apiBaseUrl?: string } = {}) {
  const { setCoords, serviceability, setServiceability } = useDeliveryCoords();

  const handleResponse = useCallback((data: NearestStoreResponse) => {
    if (data.serviceable) {
      window.localStorage.setItem(STORE_ID_KEY, data.store.id.toString());
      setStoreCookie(data.store.id);
      setServiceability({ status: "serviceable", store: data.store });
      return data;
    }

    window.localStorage.removeItem(STORE_ID_KEY);
    clearStoreCookie();
    setServiceability({ status: "unserviceable" });
    return data;
  }, [setServiceability]);

  const checkByCoords = useCallback(
    async (coords: { lat: number; lng: number }) => {
      setServiceability({ status: "checking" });
      setCoords(coords);
      try {
        const data = await fetchNearestStore({
          lat: coords.lat,
          lng: coords.lng,
          baseUrl: apiBaseUrl
        });
        return handleResponse(data);
      } catch (error) {
        setServiceability({
          status: "error",
          error: error instanceof Error ? error.message : "Unable to check serviceability."
        });
        return { serviceable: false } as NearestStoreResponse;
      }
    },
    [apiBaseUrl, handleResponse, setCoords, setServiceability]
  );

  const detectAndCheck = useCallback(async () => {
    if (!navigator.geolocation) {
      setServiceability({ status: "error", error: "Geolocation is not supported." });
      return { serviceable: false } as NearestStoreResponse;
    }

    setServiceability({ status: "checking" });
    return new Promise<NearestStoreResponse>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = Number(position.coords.latitude.toFixed(6));
          const lng = Number(position.coords.longitude.toFixed(6));
          const data = await checkByCoords({ lat, lng });
          resolve(data);
        },
        () => {
          setServiceability({ status: "error", error: "Unable to detect location." });
          resolve({ serviceable: false } as NearestStoreResponse);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
      );
    });
  }, [checkByCoords, setServiceability]);

  return {
    status: serviceability.status,
    store: serviceability.store,
    error: serviceability.error,
    serviceable: serviceability.status === "serviceable",
    checkByCoords,
    detectAndCheck
  };
}
