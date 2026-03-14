"use client";

import { useCallback, useEffect, useState } from "react";

import { useDeliveryCoords } from "@/context/DeliveryContext";
import { DeliveryFeeConfig, normalizeDeliveryFeeConfig } from "@/lib/delivery";
import { fetchNearestStore } from "@/lib/store-api";

export function useDeliveryPricing() {
  const { coords } = useDeliveryCoords();
  const [state, setState] = useState<{ distanceKm?: number; feeConfig: DeliveryFeeConfig | null }>({
    distanceKm: undefined,
    feeConfig: null
  });

  const refresh = useCallback(() => {
    if (!coords) {
      setState({ distanceKm: undefined, feeConfig: null });
      return;
    }
    fetchNearestStore({ lat: coords.lat, lng: coords.lng })
      .then((data) => {
        if (!data.serviceable) {
          setState({ distanceKm: undefined, feeConfig: null });
          return;
        }
        const normalized = normalizeDeliveryFeeConfig(data.fees);
        setState({
          distanceKm: data.store.distance,
          feeConfig: normalized
        });
      })
      .catch(() => {
        setState({ distanceKm: undefined, feeConfig: null });
      });
  }, [coords]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleFocus = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  return state;
}
