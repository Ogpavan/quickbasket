"use client";

import { useEffect, useRef, useState } from "react";

type StoreLocation = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  delivery_radius: number;
  address?: string | null;
};

type LoadState = "idle" | "loading" | "ready" | "error";

export function DeliveryAreasMap() {
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [mapState, setMapState] = useState<LoadState>("idle");
  const [dataState, setDataState] = useState<LoadState>("idle");

  useEffect(() => {
    let cancelled = false;
    setDataState("loading");

    fetch("/api/stores", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load stores");
        }
        return response.json();
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Invalid store list");
        }
        if (!cancelled) {
          setStores(data);
          setDataState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!googleApiKey) {
      setMapState("error");
      return;
    }

    if ((window as any).google?.maps) {
      setMapState("ready");
      return;
    }

    setMapState("loading");
    const existing = document.getElementById("google-areas-script") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setMapState("ready"));
      existing.addEventListener("error", () => setMapState("error"));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-areas-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapState("ready");
    script.onerror = () => setMapState("error");
    document.head.appendChild(script);
  }, [googleApiKey]);

  useEffect(() => {
    if (mapState !== "ready" || dataState !== "ready" || !mapContainerRef.current) {
      return;
    }

    const googleMaps = (window as any).google;
    if (!googleMaps?.maps?.Map) {
      return;
    }

    if (!stores.length) {
      return;
    }

    if (!mapInstanceRef.current) {
      const first = stores[0];
      mapInstanceRef.current = new googleMaps.maps.Map(mapContainerRef.current, {
        center: { lat: first.latitude, lng: first.longitude },
        zoom: 12,
        disableDefaultUI: false,
        mapTypeControl: false,
        streetViewControl: false
      });
    }

    const map = mapInstanceRef.current;
    const bounds = new googleMaps.maps.LatLngBounds();

    stores.forEach((store) => {
      const position = { lat: store.latitude, lng: store.longitude };
      bounds.extend(position);
      new googleMaps.maps.Marker({
        map,
        position,
        title: store.name
      });
      if (store.delivery_radius > 0) {
        new googleMaps.maps.Circle({
          map,
          center: position,
          radius: store.delivery_radius * 1000,
          strokeColor: "#16a34a",
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillColor: "#22c55e",
          fillOpacity: 0.12
        });
      }
    });

    if (stores.length > 1) {
      map.fitBounds(bounds);
    } else {
      map.setZoom(13);
    }
  }, [dataState, mapState, stores]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-line bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Delivery areas</p>
            <h1 className="mt-1 text-2xl font-semibold text-brand-ink">Serviceable zones by store</h1>
          </div>
          <div className="text-xs text-slate-500">
            {dataState === "loading" ? "Loading stores..." : `${stores.length} stores`}
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-xl border border-brand-line">
          {mapState === "error" ? (
            <div className="flex h-[420px] items-center justify-center bg-slate-50 text-sm text-slate-500">
              Google Maps is not configured.
            </div>
          ) : (
            <div
              ref={mapContainerRef}
              className="h-[420px] w-full bg-slate-50"
              aria-label="Delivery areas map"
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {dataState === "error" ? (
          <div className="rounded-xl border border-brand-line bg-white p-4 text-sm text-rose-500">
            Unable to load store locations right now.
          </div>
        ) : stores.length === 0 ? (
          <div className="rounded-xl border border-brand-line bg-white p-4 text-sm text-slate-500">
            No store locations available.
          </div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="rounded-xl border border-brand-line bg-white p-4">
              <p className="text-sm font-semibold text-brand-ink">{store.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {store.address || "Address not set"}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Radius</span>
                <span className="font-semibold text-brand-ink">
                  {store.delivery_radius > 0 ? `${store.delivery_radius} km` : "Not set"}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                <span>Coordinates</span>
                <span className="font-semibold text-brand-ink">
                  {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
