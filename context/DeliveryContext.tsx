"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type DeliveryCoords = { lat: number; lng: number } | null;
export type ServiceabilityStatus = "idle" | "checking" | "serviceable" | "unserviceable" | "error";
export type StoreSummary = {
  id: number;
  name: string;
  distance: number;
};

export interface ServiceabilityState {
  status: ServiceabilityStatus;
  store?: StoreSummary;
  error?: string;
}

interface DeliveryContextValue {
  coords: DeliveryCoords;
  setCoords: (coords: DeliveryCoords) => void;
  serviceability: ServiceabilityState;
  setServiceability: (state: ServiceabilityState) => void;
}

const DeliveryContext = createContext<DeliveryContextValue | undefined>(undefined);

export function DeliveryProvider({ children }: { children: React.ReactNode }) {
  const [coords, setCoords] = useState<DeliveryCoords>(null);
  const [serviceability, setServiceability] = useState<ServiceabilityState>({ status: "idle" });
  const value = useMemo(
    () => ({ coords, setCoords, serviceability, setServiceability }),
    [coords, serviceability]
  );

  return <DeliveryContext.Provider value={value}>{children}</DeliveryContext.Provider>;
}

export function useDeliveryCoords() {
  const context = useContext(DeliveryContext);
  if (!context) {
    throw new Error("useDeliveryCoords must be used within DeliveryProvider");
  }
  return context;
}
