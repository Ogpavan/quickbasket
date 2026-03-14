"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { AddressCard, AddressCardData } from "@/components/AddressCard";
import { CartItem } from "@/components/CartItem";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useDeliveryCoords } from "@/context/DeliveryContext";
import { useDeliveryPricing } from "@/hooks/useDeliveryPricing";
import { useNearestStore } from "@/hooks/useNearestStore";
import { calculateCartTotals, cn, formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const { items, subtotal, isCartOpen, closeCart } = useCart();
  const { user, openAuth, token } = useAuth();
  const router = useRouter();
  const { coords: headerCoords } = useDeliveryCoords();
  const { distanceKm, feeConfig } = useDeliveryPricing();
  const { status: serviceStatus, error: serviceError, checkByCoords } = useNearestStore();
  const totals = useMemo(
    () => calculateCartTotals(subtotal, { distanceKm, feeConfig }),
    [subtotal, distanceKm, feeConfig]
  );
  const deliveryLines = totals.deliveryBreakdown?.lines ?? [];
  const hasDeliveryBreakdown = deliveryLines.length > 0;
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
  const [step, setStep] = useState<"cart" | "address" | "review">("cart");
  const [addresses, setAddresses] = useState<AddressCardData[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [defaultAddressId, setDefaultAddressId] = useState<number | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [headerLocationLabel, setHeaderLocationLabel] = useState("");
  const [form, setForm] = useState({
    label: "",
    name: "",
    phone: "",
    house_no: "",
    building_name: "",
    floor: "",
    area: "",
    landmark: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [validationErrors, setValidationErrors] = useState({
    label: false,
    building_name: false,
    area: false,
    landmark: false,
    name: false
  });
  const [mapAddressLabel, setMapAddressLabel] = useState("");
  const [pendingAddressQuery, setPendingAddressQuery] = useState<string | null>(null);
  const [preferredCoords, setPreferredCoords] = useState<{ lat: number; lng: number } | null>(null);
  const scriptPromiseRef = useRef<Promise<void> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const placeContainerRef = useRef<HTMLDivElement | null>(null);
  const placeElementRef = useRef<any>(null);
  const [isMapsReady, setIsMapsReady] = useState(false);
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );
  const headerMeta = useMemo(() => {
    if (step === "address") {
      return { label: "Delivery address", title: "Select delivery location" };
    }
    if (step === "review") {
      return { label: "Order summary", title: "Review your order" };
    }
    return { label: "Your cart", title: `${items.length} items` };
  }, [items.length, step]);

  const loadGoogleScript = () => {
    if ((window as any).google?.maps) {
      return Promise.resolve();
    }
    if (!googleApiKey) {
      return Promise.reject(new Error("Missing Google API key"));
    }

    if (scriptPromiseRef.current) {
      return scriptPromiseRef.current;
    }

    scriptPromiseRef.current = new Promise((resolve, reject) => {
      const existingScript = document.getElementById("google-places-script") as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Google script")));
        return;
      }

      const script = document.createElement("script");
      script.id = "google-places-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google script"));
      document.head.appendChild(script);
    });

    return scriptPromiseRef.current;
  };

  const extractComponent = (
    components: Array<{ long_name: string; short_name: string; types: string[] }>,
    type: string
  ) => components.find((component) => component.types.includes(type))?.long_name ?? "";

  const extractFirstComponent = (
    components: Array<{ long_name: string; short_name: string; types: string[] }>,
    types: string[]
  ) => types.map((type) => extractComponent(components, type)).find(Boolean) ?? "";

  const applyAddressFromComponents = (
    components: Array<{ long_name: string; short_name: string; types: string[] }>,
    formatted?: string
  ) => {
    const house = extractComponent(components, "street_number");
    const route = extractComponent(components, "route");
    const premise = extractComponent(components, "premise");
    const subpremise = extractComponent(components, "subpremise");
    const locality = extractFirstComponent(components, [
      "sublocality_level_1",
      "sublocality_level_2",
      "sublocality_level_3",
      "sublocality",
      "locality",
      "administrative_area_level_3",
      "administrative_area_level_2",
      "administrative_area_level_1"
    ]);
    const landmark =
      extractComponent(components, "point_of_interest") || extractComponent(components, "neighborhood");

    setForm((current) => ({
      ...current,
      house_no: house || subpremise || current.house_no,
      building_name: premise || route || current.building_name,
      area: locality || current.area,
      landmark: landmark || current.landmark
    }));

    if (formatted) {
      setMapAddressLabel(formatted);
    }
  };

  const reverseGeocode = (latLng: { lat: number; lng: number }) => {
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps?.Geocoder) {
      return;
    }
    const geocoder = new googleMaps.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results: any[], status: string) => {
      if (status !== "OK" || !results?.[0]) {
        return;
      }
      const result = results[0];
      if (result?.address_components) {
        applyAddressFromComponents(result.address_components, result.formatted_address);
      }
    });
  };

  const updateServiceabilityFromAddress = async (address: AddressCardData) => {
    const addressText = [
      address.house_no,
      address.building_name,
      address.area,
      address.landmark,
      address.city
    ]
      .filter(Boolean)
      .join(", ");

    if (!addressText) {
      return;
    }

    try {
      await loadGoogleScript();
      const googleMaps = (window as any).google;
      if (!googleMaps?.maps?.Geocoder) {
        return;
      }
      const geocoder = new googleMaps.maps.Geocoder();
      geocoder.geocode({ address: addressText }, (results: any[], status: string) => {
        if (status !== "OK" || !results?.[0]?.geometry?.location) {
          return;
        }
        const location = results[0].geometry.location;
        const lat = Number(location.lat().toFixed(6));
        const lng = Number(location.lng().toFixed(6));
        void checkByCoords({ lat, lng });
      });
    } catch {
      // ignore geocode failures
    }
  };

  const handleCheckoutClick = () => {
    if (!user || !token) {
      closeCart();
      openAuth("checkout");
      return;
    }
    setStep("address");
  };

  useEffect(() => {
    if (!isCartOpen) {
      setStep("cart");
      setIsAddressModalOpen(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (items.length === 0) {
      setStep("cart");
    }
  }, [items.length]);

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }
    const stored = window.localStorage.getItem("delivery-location");
    if (stored) {
      setHeaderLocationLabel(stored);
    }
  }, [isCartOpen]);

  useEffect(() => {
    const stored = window.localStorage.getItem("quickbasket-default-address");
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) {
        setDefaultAddressId(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (step !== "address" || !token) {
      return;
    }

    const controller = new AbortController();
    setIsAddressLoading(true);
    setAddressError("");

    fetch("/wp-json/app/v1/user-addresses", {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load addresses");
        }
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setAddresses(data);
        } else {
          setAddresses([]);
        }
      })
      .catch((fetchError) => {
        if (fetchError?.name === "AbortError") {
          return;
        }
        setAddressError("Unable to load saved addresses.");
      })
      .finally(() => setIsAddressLoading(false));

    return () => controller.abort();
  }, [step, token]);

  useEffect(() => {
    if (!addresses.length) {
      return;
    }
    if (selectedAddressId != null) {
      return;
    }
    if (defaultAddressId && addresses.some((address) => address.id === defaultAddressId)) {
      setSelectedAddressId(defaultAddressId);
      return;
    }
    setSelectedAddressId(addresses[0].id ?? null);
  }, [addresses, defaultAddressId, selectedAddressId]);

  useEffect(() => {
    if (!isAddressModalOpen || !googleApiKey) {
      return;
    }

    loadGoogleScript()
      .then(() => setIsMapsReady(true))
      .catch(() => setIsMapsReady(false));
  }, [googleApiKey, isAddressModalOpen]);

  useEffect(() => {
    if (!isMapsReady || !isAddressModalOpen || !mapContainerRef.current || mapInstanceRef.current) {
      return;
    }

    const googleMaps = (window as any).google;
    if (!googleMaps?.maps?.importLibrary) {
      return;
    }

    let isMounted = true;

    const initMap = async () => {
      await googleMaps.maps.importLibrary("maps");
      await googleMaps.maps.importLibrary("places");

      if (!isMounted || !mapContainerRef.current) {
        return;
      }

      const initialCenter = preferredCoords || headerCoords || { lat: 28.6139, lng: 77.209 };
      const map = new googleMaps.maps.Map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 15,
        disableDefaultUI: true
      });
      mapInstanceRef.current = map;

      const marker = new googleMaps.maps.Marker({
        map,
        position: initialCenter,
        draggable: true
      });
      markerRef.current = marker;

      map.addListener("click", (event: any) => {
        if (!event?.latLng) {
          return;
        }
        marker.setPosition(event.latLng);
        map.panTo(event.latLng);
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        reverseGeocode({ lat, lng });
        void checkByCoords({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      });

      marker.addListener("dragend", () => {
        const position = marker.getPosition();
        if (!position) {
          return;
        }
        const lat = position.lat();
        const lng = position.lng();
        reverseGeocode({ lat, lng });
        void checkByCoords({ lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) });
      });

      if (navigator.geolocation && !preferredCoords && !headerCoords) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latLng = { lat: position.coords.latitude, lng: position.coords.longitude };
            map.setCenter(latLng);
            marker.setPosition(latLng);
            reverseGeocode(latLng);
            void checkByCoords({ lat: Number(latLng.lat.toFixed(6)), lng: Number(latLng.lng.toFixed(6)) });
          },
          () => {
            // keep default center
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        );
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [isMapsReady, isAddressModalOpen, headerCoords, preferredCoords]);

  useEffect(() => {
    if (!isAddressModalOpen || !preferredCoords || !mapInstanceRef.current || !markerRef.current) {
      return;
    }
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps?.LatLng) {
      return;
    }
    const latLng = new googleMaps.maps.LatLng(preferredCoords.lat, preferredCoords.lng);
    mapInstanceRef.current.setCenter(latLng);
    mapInstanceRef.current.setZoom(16);
    markerRef.current.setPosition(latLng);
    reverseGeocode({ lat: preferredCoords.lat, lng: preferredCoords.lng });
    setPreferredCoords(null);
  }, [isAddressModalOpen, preferredCoords]);

  useEffect(() => {
    if (!isMapsReady || !isAddressModalOpen || !placeContainerRef.current || placeElementRef.current) {
      return;
    }

    const googleMaps = (window as any).google;
    if (!googleMaps?.maps?.places?.PlaceAutocompleteElement) {
      return;
    }

    const placeElement = new googleMaps.maps.places.PlaceAutocompleteElement();
    placeElement.className = "w-full";
    placeElement.style.colorScheme = "light";
    placeElement.style.borderRadius = "0.375rem";
    placeElement.style.backgroundColor = "transparent";
    placeElement.style.border = "1px solid #f7c600";
    placeElement.style.padding = "2px";
    placeElement.setAttribute("placeholder", "Search delivery location");
    placeElementRef.current = placeElement;

    placeContainerRef.current.innerHTML = "";
    placeContainerRef.current.appendChild(placeElement);

    const handleSelect = async (event: any) => {
      const prediction = event?.placePrediction;
      if (!prediction?.toPlace) {
        return;
      }
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "displayName", "location", "addressComponents"] });
      const location = place.location;
      if (location && mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(location);
        mapInstanceRef.current.setZoom(16);
        if (markerRef.current) {
          markerRef.current.setPosition(location);
        }
      }
      if (location) {
        void checkByCoords({ lat: Number(location.lat().toFixed(6)), lng: Number(location.lng().toFixed(6)) });
      }
      if (place.addressComponents?.length) {
        applyAddressFromComponents(place.addressComponents, place.formattedAddress || place.displayName);
        return;
      }
      if (location) {
        reverseGeocode({ lat: location.lat(), lng: location.lng() });
      }
    };

    placeElement.addEventListener("gmp-select", handleSelect);

    return () => {
      placeElement.removeEventListener("gmp-select", handleSelect);
      if (placeElementRef.current && placeElementRef.current.remove) {
        placeElementRef.current.remove();
      }
      placeElementRef.current = null;
    };
  }, [isMapsReady, isAddressModalOpen]);

  useEffect(() => {
    if (!pendingAddressQuery || !isMapsReady) {
      return;
    }
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps?.Geocoder) {
      return;
    }
    const geocoder = new googleMaps.maps.Geocoder();
    geocoder.geocode({ address: pendingAddressQuery }, (results: any[], status: string) => {
      if (status !== "OK" || !results?.[0]) {
        return;
      }
      const location = results[0].geometry?.location;
      if (location && mapInstanceRef.current) {
        mapInstanceRef.current.setCenter(location);
        mapInstanceRef.current.setZoom(16);
        if (markerRef.current) {
          markerRef.current.setPosition(location);
        }
      }
      if (location) {
        void checkByCoords({ lat: Number(location.lat().toFixed(6)), lng: Number(location.lng().toFixed(6)) });
      }
      if (results[0].address_components) {
        applyAddressFromComponents(results[0].address_components, results[0].formatted_address);
      }
      setPendingAddressQuery(null);
    });
  }, [isMapsReady, pendingAddressQuery]);

  useEffect(() => {
    if (isAddressModalOpen) {
      return;
    }
    mapInstanceRef.current = null;
    markerRef.current = null;
    placeElementRef.current = null;
    setMapAddressLabel("");
    setPendingAddressQuery(null);
  }, [isAddressModalOpen]);

  const handleOpenAddressModal = ({
    prefillLabel,
    prefillQuery,
    prefillCoords
  }: {
    prefillLabel?: string;
    prefillQuery?: string;
    prefillCoords?: { lat: number; lng: number } | null;
  } = {}) => {
    setIsAddressModalOpen(true);
    setForm({
      label: "",
      name: user?.name || "",
      phone: user?.phone || "",
      house_no: "",
      building_name: "",
      floor: "",
      area: "",
      landmark: ""
    });
    setFormError("");
    setValidationErrors({
      label: false,
      building_name: false,
      area: false,
      landmark: false,
      name: false
    });
    setMapAddressLabel(prefillLabel ?? "");
    setPendingAddressQuery(prefillQuery ?? null);
    setPreferredCoords(prefillCoords ?? null);
  };

  const handleCloseAddressModal = () => {
    setIsAddressModalOpen(false);
    setForm({
      label: "",
      name: "",
      phone: "",
      house_no: "",
      building_name: "",
      floor: "",
      area: "",
      landmark: ""
    });
    setMapAddressLabel("");
    setFormError("");
    setValidationErrors({
      label: false,
      building_name: false,
      area: false,
      landmark: false,
      name: false
    });
    setPreferredCoords(null);
  };

  const handleUseHeaderLocation = () => {
    if (headerCoords) {
      handleOpenAddressModal({
        prefillLabel: headerLocationLabel || "Current location",
        prefillCoords: { lat: headerCoords.lat, lng: headerCoords.lng }
      });
      void checkByCoords({ lat: headerCoords.lat, lng: headerCoords.lng });
      return;
    }

    if (headerLocationLabel) {
      handleOpenAddressModal({
        prefillLabel: headerLocationLabel,
        prefillQuery: headerLocationLabel
      });
    }
  };

  const handleSubmitAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setFormError("Please sign in again to manage addresses.");
      return;
    }

    const nextErrors = {
      label: !form.label,
      building_name: !form.building_name,
      area: !form.area,
      landmark: !form.landmark,
      name: !form.name
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setValidationErrors(nextErrors);
      setFormError("Please fill all required address fields.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const payload = {
        ...form,
        address_line: [form.house_no, form.building_name, form.area, form.landmark].filter(Boolean).join(", "),
        city: form.area
      };

      const response = await fetch("/wp-json/app/v1/user-addresses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as AddressCardData & { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save address.");
      }

      setAddresses((current) => [result, ...current]);
      if (result.id) {
        setDefaultAddressId(result.id);
        setSelectedAddressId(result.id);
        window.localStorage.setItem("quickbasket-default-address", result.id.toString());
      }
      handleCloseAddressModal();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : "Unable to save address.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddress = async (address: AddressCardData) => {
    if (!address.id || !token) {
      return;
    }
    if (!window.confirm("Delete this address?")) {
      return;
    }

    setAddressError("");

    try {
      const response = await fetch(`/wp-json/app/v1/address/${address.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setAddresses((current) => current.filter((item) => item.id !== address.id));
      setSelectedAddressId((current) => (current === address.id ? null : current));
      setDefaultAddressId((current) => {
        if (current === address.id) {
          window.localStorage.removeItem("quickbasket-default-address");
          return null;
        }
        return current;
      });
    } catch {
      setAddressError("Unable to delete address.");
    }
  };

  const handleSetDefault = (address: AddressCardData) => {
    if (!address.id) {
      return;
    }
    setDefaultAddressId(address.id);
    window.localStorage.setItem("quickbasket-default-address", address.id.toString());
  };

  const handleContinueToReview = () => {
    if (!selectedAddress) {
      return;
    }
    setStep("review");
  };

  const handleProceedToPay = () => {
    if (!selectedAddress) {
      return;
    }
    const payload = {
      address: selectedAddress,
      items,
      totals,
      delivery: {
        distanceKm,
        feeConfig
      }
    };
    window.localStorage.setItem("quickbasket-payment", JSON.stringify(payload));
    closeCart();
    router.push("/payment");
  };

  return (
    <div
      className={cn("fixed inset-0 z-50 transition", isCartOpen ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!isCartOpen}
    >
      <button
        type="button"
        onClick={closeCart}
        className={cn(
          "absolute inset-0 bg-slate-950/30 backdrop-blur-sm transition duration-300",
          isCartOpen ? "opacity-100" : "opacity-0"
        )}
      />

      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition duration-300",
          isCartOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
          <div className="flex items-center gap-3">
            {step !== "cart" ? (
              <button
                type="button"
                onClick={() => setStep(step === "review" ? "address" : "cart")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-line text-brand-ink transition hover:border-brand-yellow"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-muted">{headerMeta.label}</p>
              <h2 className="mt-1 text-xl font-semibold text-brand-ink">{headerMeta.title}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-line text-brand-ink transition hover:border-brand-yellow"
            aria-label="Close cart drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {step === "cart" ? (
            <div className="space-y-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-md bg-brand-cream px-6 text-center">
                  <h3 className="text-xl font-semibold text-brand-ink">Your cart is empty</h3>
                  <p className="mt-3 max-w-xs text-sm leading-6 text-brand-muted">
                    Add essentials to your basket and we will have them on the way in minutes.
                  </p>
                </div>
              ) : (
                items.map((item) => <CartItem key={item.lineId} item={item} compact />)
              )}
            </div>
          ) : null}

          {step === "address" ? (
            <div className="space-y-4">
              {headerCoords || headerLocationLabel ? (
                <button
                  type="button"
                  onClick={handleUseHeaderLocation}
                  className="w-full rounded-md border border-dashed border-brand-line bg-brand-cream/60 px-4 py-3 text-left text-sm text-brand-ink transition hover:border-brand-yellow"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Use current location</p>
                  <p className="mt-1 text-sm font-semibold text-brand-ink">
                    {headerLocationLabel || "Current location"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Use the delivery location selected in the header.
                  </p>
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleOpenAddressModal()}
                className="inline-flex w-full items-center justify-center rounded-md border border-brand-line bg-white px-4 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-yellow"
              >
                + Add new address
              </button>
              {addressError ? <p className="text-xs text-rose-500">{addressError}</p> : null}
              {isAddressLoading ? (
                <p className="text-sm text-slate-500">Loading addresses...</p>
              ) : addresses.length === 0 ? (
                <div className="rounded-md border border-dashed border-brand-line bg-slate-50 p-4 text-sm text-slate-500">
                  No saved addresses yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <AddressCard
                      key={address.id}
                      data={address}
                      selected={selectedAddressId === address.id}
                      isDefault={defaultAddressId === address.id}
                      onSetDefault={handleSetDefault}
                      onDelete={handleDeleteAddress}
                      iconOnlyDelete
                      onSelect={(selected) => {
                        setSelectedAddressId(selected.id ?? null);
                        void updateServiceabilityFromAddress(selected);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-4">
              <div className="rounded-md border border-brand-line bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Delivering to</p>
                <p className="mt-2 text-sm font-semibold text-brand-ink">
                  {selectedAddress?.label ?? "Selected address"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedAddress
                    ? [
                        selectedAddress.name,
                        selectedAddress.house_no,
                        selectedAddress.building_name,
                        selectedAddress.floor ? `Floor ${selectedAddress.floor}` : null,
                        selectedAddress.area,
                        selectedAddress.landmark,
                        selectedAddress.address_line,
                        selectedAddress.city
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : "Select an address to continue."}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">My order</p>
                <div className="space-y-2 rounded-md border border-brand-line bg-white p-3">
                  {items.map((item) => (
                    <div key={item.lineId} className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-brand-ink">{item.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.weight} x {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-brand-ink">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-brand-line px-5 py-5">
          {step === "cart" ? (
            <>
              <div className="mb-4 space-y-2 text-sm text-brand-muted">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="text-sm font-semibold text-brand-ink">{formatPrice(totals.subtotal)}</span>
                </div>
                {hasDeliveryBreakdown ? (
                  <div className="space-y-1">
                    {deliveryLines.map((line, index) => (
                      <div key={`${line.label}-${index}`} className="flex items-center justify-between text-xs">
                        <span>{line.label}</span>
                        {typeof line.amount === "number" ? (
                          <span className="font-semibold text-brand-ink">{formatPrice(line.amount)}</span>
                        ) : (
                          <span className="font-semibold text-brand-ink">-</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null}
                {totals.handlingFee > 0 ? (
                  <div className="flex items-center justify-between text-xs">
                    <span>Handling charge</span>
                    <span className="font-semibold text-brand-ink">{formatPrice(totals.handlingFee)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span>Delivery fee</span>
                  <span className="text-sm font-semibold text-brand-ink">
                    {totals.deliveryFee === 0 ? "Free" : formatPrice(totals.deliveryFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-brand-line pt-2">
                  <span className="text-lg font-bold text-brand-ink">Total</span>
                  <span className="text-lg font-bold text-brand-ink">{formatPrice(totals.total)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-brand-muted">
                  {user
                    ? `Signed in as ${user.name}.`
                    : "Sign in with your phone number before checkout."}
                </p>
                {items.length === 0 ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow/60 px-5 py-3 text-sm font-semibold text-brand-ink"
                    >
                      Add items to checkout
                    </button>
                    <p className="text-xs text-slate-500">Your cart is empty.</p>
                  </>
                ) : serviceStatus === "unserviceable" ? (
                  <>
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow/60 px-5 py-3 text-sm font-semibold text-brand-ink"
                    >
                      Service unavailable
                    </button>
                    <p className="text-xs text-rose-500">Service unavailable for the selected location.</p>
                  </>
                ) : user ? (
                  <button
                    type="button"
                    onClick={handleCheckoutClick}
                    className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-5 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-95"
                  >
                    Proceed to Checkout
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckoutClick}
                    className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-5 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-95"
                  >
                    Login to Checkout
                  </button>
                )}
                {serviceStatus === "error" && serviceError ? (
                  <p className="text-xs text-rose-500">{serviceError}</p>
                ) : null}
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="inline-flex w-full items-center justify-center rounded-md border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-yellow hover:text-brand-ink"
                >
                  View full cart
                </Link>
              </div>
            </>
          ) : null}

          {step === "address" ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleContinueToReview}
                disabled={!selectedAddress}
                className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-5 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-95 disabled:opacity-60"
              >
                Continue with this address
              </button>
            </div>
          ) : null}

          {step === "review" ? (
            <div className="space-y-3">
              <div className="space-y-2 text-sm text-brand-muted">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="text-sm font-semibold text-brand-ink">{formatPrice(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery fee</span>
                  <span className="text-sm font-semibold text-brand-ink">
                    {totals.deliveryFee === 0 ? "Free" : formatPrice(totals.deliveryFee)}
                  </span>
                </div>
                {totals.handlingFee > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Handling charge</span>
                    <span className="text-sm font-semibold text-brand-ink">{formatPrice(totals.handlingFee)}</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-dashed border-brand-line pt-2">
                  <span className="text-lg font-bold text-brand-ink">Total</span>
                  <span className="text-lg font-bold text-brand-ink">{formatPrice(totals.total)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleProceedToPay}
                disabled={!selectedAddress}
                className="inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-5 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-95 disabled:opacity-60"
              >
                Proceed to Pay
              </button>
            </div>
          ) : null}
        </div>
      </aside>

      {isAddressModalOpen ? (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" aria-hidden="true" />
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-5xl rounded-md bg-white shadow-float">
              <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-brand-ink">Add new address</p>
                  {mapAddressLabel ? <p className="mt-1 text-xs text-brand-muted">{mapAddressLabel}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={handleCloseAddressModal}
                  className="text-sm font-semibold text-brand-ink transition hover:text-brand-green"
                >
                  Close
                </button>
              </div>
              <div className="grid gap-6 px-5 py-5 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="flex h-[520px] flex-col gap-3">
                  <div>
                    <p className="text-xs font-semibold text-brand-ink">Search location</p>
                    <div ref={placeContainerRef} className="mt-2 w-full" />
                  </div>
                  <div
                    ref={mapContainerRef}
                    className="flex-1 w-full rounded-md border border-brand-line bg-slate-50"
                  >
                    {!googleApiKey ? (
                      <div className="flex h-full items-center justify-center text-xs text-slate-500">
                        Missing Google Maps API key.
                      </div>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500">Tap on the map or drag the pin to fill the address fields.</p>
                </div>
                <form onSubmit={handleSubmitAddress} className="flex h-[520px] flex-col">
                  <div className="space-y-3 overflow-y-auto pr-1">
                    <fieldset
                      className={`text-xs font-semibold text-brand-ink ${
                        validationErrors.label ? "rounded-md border border-rose-500 p-2" : ""
                      }`}
                    >
                      <legend className="mb-1">Label</legend>
                      <div className="flex items-center gap-4">
                        {["Home", "Office"].map((option) => (
                          <label key={option} className="inline-flex items-center gap-2 text-xs text-brand-ink">
                            <input
                              type="radio"
                              name="address-label"
                              value={option}
                              checked={form.label === option}
                              onChange={() => setForm((current) => ({ ...current, label: option }))}
                              className="h-4 w-4 accent-brand-green"
                            />
                            {option}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="text-xs font-semibold text-brand-ink">
                      Flat / House No.
                      <input
                        value={form.house_no}
                        onChange={(event) => setForm((current) => ({ ...current, house_no: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-brand-line bg-white px-3 text-sm"
                        placeholder="Flat / House No."
                      />
                    </label>
                    <label className="text-xs font-semibold text-brand-ink">
                      Building name
                      <input
                        value={form.building_name}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, building_name: event.target.value }))
                        }
                        className={`mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm ${
                          validationErrors.building_name ? "border-rose-500" : "border-brand-line"
                        }`}
                        placeholder="Building / Society"
                      />
                    </label>
                    <label className="text-xs font-semibold text-brand-ink">
                      Floor (optional)
                      <input
                        value={form.floor}
                        onChange={(event) => setForm((current) => ({ ...current, floor: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-brand-line bg-white px-3 text-sm"
                        placeholder="Floor"
                      />
                    </label>
                    <label className="text-xs font-semibold text-brand-ink">
                      Area / Sector / Locality
                      <input
                        value={form.area}
                        onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
                        className={`mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm ${
                          validationErrors.area ? "border-rose-500" : "border-brand-line"
                        }`}
                        placeholder="Area / Sector / Locality"
                      />
                    </label>
                    <label className="text-xs font-semibold text-brand-ink">
                      Nearby landmark
                      <input
                        value={form.landmark}
                        onChange={(event) => setForm((current) => ({ ...current, landmark: event.target.value }))}
                        className={`mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm ${
                          validationErrors.landmark ? "border-rose-500" : "border-brand-line"
                        }`}
                        placeholder="Nearby landmark"
                      />
                    </label>
                    <label className="text-xs font-semibold text-brand-ink">
                      Name
                      <input
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className={`mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm ${
                          validationErrors.name ? "border-rose-500" : "border-brand-line"
                        }`}
                        placeholder="Recipient name"
                      />
                    </label>
                    <label className="text-xs font-semibold text-brand-ink">
                      Phone (optional)
                      <input
                        value={form.phone}
                        onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                        className="mt-1 h-10 w-full rounded-md border border-brand-line bg-white px-3 text-sm"
                        placeholder="Phone number"
                      />
                    </label>
                    {formError ? <p className="text-xs text-rose-500">{formError}</p> : null}
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={handleCloseAddressModal}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-brand-line px-4 text-sm font-semibold text-brand-ink transition hover:border-brand-green"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-brand-green px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
                    >
                      {isSaving ? "Saving..." : "Save address"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
