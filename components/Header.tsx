/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, MapPin, Search, ShoppingCart, UserRound } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";

import { AddressCard, AddressCardData } from "@/components/AddressCard";
import { SearchBar } from "@/components/SearchBar";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNearestStore } from "@/hooks/useNearestStore";
import { cn } from "@/lib/utils";
import type { GroceryProduct } from "@/types/product";

export function Header() {
  const { itemCount, openCart } = useCart();
  const { user, openAuth, logout, token } = useAuth();
  const accountLabel = user ? user.name.split(" ")[0] : "Sign in";
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
  const [locationLabel, setLocationLabel] = useState("Detecting...");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "error">("idle");
  const locationRef = useRef<HTMLDivElement | null>(null);
  const placeContainerRef = useRef<HTMLDivElement | null>(null);
  const placeElementRef = useRef<any>(null);
  const [isPlacesReady, setIsPlacesReady] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const hasAutoDetectedRef = useRef(false);
  const scriptPromiseRef = useRef<Promise<void> | null>(null);
  const [hasDefaultAddress, setHasDefaultAddress] = useState(false);
  const [defaultAddressId, setDefaultAddressId] = useState<number | null>(null);
  const [addresses, setAddresses] = useState<AddressCardData[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const showBackdrop = isLocationOpen || isAccountOpen;
  const [searchResults, setSearchResults] = useState<GroceryProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { status: serviceStatus, error: serviceError, checkByCoords } = useNearestStore();
  const handleBackdropClick = () => {
    setIsLocationOpen(false);
    setIsAccountOpen(false);
  };

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    setIsLocationOpen(false);
    setIsAccountOpen(false);
  };

  const handleSearchBlur = () => {
    window.setTimeout(() => {
      setIsSearchFocused(false);
    }, 180);
  };

  const handleSearchSuggestions = ({
    loading,
    suggestions
  }: {
    loading: boolean;
    suggestions: GroceryProduct[];
  }) => {
    setSearchLoading(loading);
    setSearchResults(suggestions);
  };

  const openSearchOverlay = () => {
    setIsLocationOpen(false);
    setIsAccountOpen(false);
    setIsSearchFocused(true);
    if (typeof window === "undefined") {
      return;
    }
    window.setTimeout(() => {
      const desktopInput = document.getElementById("global-grocery-search") as HTMLInputElement | null;
      const mobileInput = document.getElementById("global-grocery-search-mobile") as HTMLInputElement | null;
      (desktopInput ?? mobileInput)?.focus();
    }, 0);
  };

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

  useEffect(() => {
    const storedDefault = window.localStorage.getItem("quickbasket-default-address");
    if (storedDefault) {
      const parsed = Number.parseInt(storedDefault, 10);
      if (Number.isFinite(parsed)) {
        setDefaultAddressId(parsed);
      }
      setHasDefaultAddress(true);
      setLocationLabel("Loading address...");
      return;
    }

    const stored = window.localStorage.getItem("delivery-location");
    if (stored) {
      setLocationLabel(stored);
      return;
    }

    if (hasAutoDetectedRef.current) {
      return;
    }

    if (hasDefaultAddress) {
      return;
    }

    hasAutoDetectedRef.current = true;
    setIsLocationOpen(true);
    loadGoogleScript()
      .then(() => setIsPlacesReady(true))
      .catch(() => setIsPlacesReady(false));

    const attemptDetect = () => {
      handleDetectLocation();
    };

    if ("permissions" in navigator && typeof navigator.permissions.query === "function") {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          if (status.state === "denied") {
            setLocationLabel("Location access denied");
            setGeoStatus("error");
            return;
          }
          attemptDetect();
        })
        .catch(() => attemptDetect());
    } else {
      attemptDetect();
    }
  }, []);

  useEffect(() => {
    if (locationLabel) {
      window.localStorage.setItem("delivery-location", locationLabel);
    }
  }, [locationLabel]);

  useEffect(() => {
    if (!isLocationOpen || !token) {
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
  }, [isLocationOpen, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const storedDefault = window.localStorage.getItem("quickbasket-default-address");
    if (!storedDefault) {
      return;
    }

    const defaultId = Number.parseInt(storedDefault, 10);
    if (!Number.isFinite(defaultId)) {
      return;
    }

    const controller = new AbortController();

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
        if (!Array.isArray(data)) {
          return;
        }
        const match = data.find((item) => item?.id === defaultId);
        if (!match) {
          return;
        }
        const parts = [
          match.name,
          match.house_no,
          match.building_name,
          match.floor ? `Floor ${match.floor}` : null,
          match.area,
          match.landmark
        ]
          .filter(Boolean)
          .join(", ");
        const label = parts || match.address_line || "Saved address";
        setLocationLabel(label);
        setHasDefaultAddress(true);
      })
      .catch(() => {
        // ignore
      });

    return () => controller.abort();
  }, [token]);

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

  const handleSelectAddress = (address: AddressCardData) => {
    const parts = [
      address.name,
      address.house_no,
      address.building_name,
      address.floor ? `Floor ${address.floor}` : null,
      address.area,
      address.landmark
    ]
      .filter(Boolean)
      .join(", ");
    const label = parts || address.address_line || "Saved address";
    setLocationLabel(label);
    if (address.id) {
      setDefaultAddressId(address.id);
      window.localStorage.setItem("quickbasket-default-address", address.id.toString());
      setHasDefaultAddress(true);
    }
    void updateServiceabilityFromAddress(address);
    setIsLocationOpen(false);
  };

  const handleSetDefaultAddress = (address: AddressCardData) => {
    if (!address.id) {
      return;
    }
    setDefaultAddressId(address.id);
    window.localStorage.setItem("quickbasket-default-address", address.id.toString());
    setHasDefaultAddress(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (locationRef.current && !locationRef.current.contains(event.target)) {
        setIsLocationOpen(false);
      }

      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isLocationOpen || !googleApiKey) {
      return;
    }

    loadGoogleScript()
      .then(() => setIsPlacesReady(true))
      .catch(() => setIsPlacesReady(false));
  }, [googleApiKey, isLocationOpen]);

  useEffect(() => {
    if (!isPlacesReady || !isLocationOpen || !placeContainerRef.current || placeElementRef.current) {
      return;
    }

    const googleMaps = (window as any).google;
    if (!googleMaps?.maps?.importLibrary) {
      return;
    }

    let isMounted = true;

    const initPlaces = async () => {
      await googleMaps.maps.importLibrary("places");
      if (!isMounted || !placeContainerRef.current || placeElementRef.current) {
        return;
      }

      const placeElement = new googleMaps.maps.places.PlaceAutocompleteElement();
      placeElement.className = "w-full";
      placeElement.style.colorScheme = "light";
      placeElement.style.borderRadius = "0.75rem";
      placeElement.style.backgroundColor = "transparent";
      placeElement.style.border = "1px solid #f7c600";
      placeElement.style.padding = "2px";
      placeElement.setAttribute("placeholder", "Enter area, street, or landmark");
      placeElementRef.current = placeElement;

      placeContainerRef.current.innerHTML = "";
      placeContainerRef.current.appendChild(placeElement);

      const handleSelect = async (event: any) => {
        const prediction = event?.placePrediction;
        if (!prediction?.toPlace) {
          return;
        }

        const place = prediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "displayName", "location"] });

      const label = place.formattedAddress || place.displayName || "";
      if (!label) {
        return;
      }

      const placeLocation = place.location;
      if (placeLocation && typeof placeLocation.lat === "function" && typeof placeLocation.lng === "function") {
        const lat = Number(placeLocation.lat().toFixed(6));
        const lng = Number(placeLocation.lng().toFixed(6));
        void checkByCoords({ lat, lng });
      }

      setLocationLabel(label);
      setIsLocationOpen(false);
    };

      placeElement.addEventListener("gmp-select", handleSelect);

      return () => {
        placeElement.removeEventListener("gmp-select", handleSelect);
      };
    };

    let cleanup: (() => void) | undefined;
    initPlaces().then((result) => {
      cleanup = result;
    });

    return () => {
      isMounted = false;
      if (cleanup) {
        cleanup();
      }
      if (placeElementRef.current && placeElementRef.current.remove) {
        placeElementRef.current.remove();
      }
      placeElementRef.current = null;
    };
  }, [isPlacesReady, isLocationOpen]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }

    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));

        void checkByCoords({ lat, lng });

        try {
          await loadGoogleScript();
          const googleMaps = (window as any).google;
          if (googleMaps?.maps?.Geocoder) {
            const geocoder = new googleMaps.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
              const label =
                status === "OK" && results?.[0]?.formatted_address
                  ? results[0].formatted_address
                  : "Current location";
              setLocationLabel(label);
              setGeoStatus("idle");
              setIsLocationOpen(false);
            });
            return;
          }
        } catch {
          // fall through to fallback label
        }

        setLocationLabel("Current location");
        setGeoStatus("idle");
        setIsLocationOpen(false);
      },
      () => {
        setGeoStatus("error");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  return (
    <>
      {showBackdrop ? (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          aria-hidden="true"
          onClick={handleBackdropClick}
        />
      ) : null}
      <header className="sticky top-0 z-50 border-b border-brand-line bg-white/95 backdrop-blur">
        <div className="site-container py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-6">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="flex items-center gap-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-yellow text-lg font-bold text-brand-ink">
                  Q
                </span>
                <div>
                  <p className="text-lg font-bold text-brand-ink">QuickBasket</p>
                  <p className="text-xs text-brand-muted">groceries in minutes</p>
                </div>
              </Link>
              <div className="flex items-center gap-2 lg:hidden">
                  <button
                    type="button"
                    onClick={openSearchOverlay}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-line bg-white text-brand-ink shadow-card transition hover:border-brand-yellow/70"
                    aria-label="Open search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                <button
                  type="button"
                  onClick={openCart}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-yellow text-brand-ink shadow-card transition hover:brightness-95"
                  aria-label="Open cart drawer"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-ink px-1 text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                </button>
                {user ? (
                  <Link
                    href="/account/orders"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-line bg-white text-brand-ink shadow-card transition hover:border-brand-yellow/70"
                    aria-label="Open profile"
                  >
                    <UserRound className="h-4 w-4 text-brand-ink" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAuth("account")}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-brand-line bg-white text-brand-muted shadow-card transition hover:border-brand-yellow/70"
                    aria-label="Sign in"
                  >
                    <UserRound className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {!isSearchFocused && (
              <div className="w-full lg:w-auto flex justify-center">
                <div className="relative w-full max-w-xl" ref={locationRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLocationOpen((prev) => !prev);
                      setIsAccountOpen(false);
                    }}
                    className="inline-flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-brand-line bg-white px-3 text-left text-sm shadow-card transition hover:border-brand-yellow/70 lg:w-auto lg:justify-start"
                    aria-label="Delivery location"
                    aria-expanded={isLocationOpen}
                  >
                    <span className="inline-flex w-full items-center gap-2">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-brand-ink" />
                      <span className="flex-1 overflow-hidden text-left leading-tight">
                        <span className="block text-[10px] text-brand-muted sm:hidden">Delivering to</span>
                        <span className="block text-xs font-medium leading-tight text-brand-ink truncate sm:max-w-[180px]">
                          {locationLabel}
                        </span>
                      </span>
                      <ChevronDown className="h-4 w-4 flex-shrink-0 text-brand-muted" />
                    </span>
                  </button>
                  {serviceStatus === "unserviceable" ? (
                    <p className="mt-1 text-xs text-rose-500">Service unavailable in your location</p>
                  ) : serviceStatus === "error" && serviceError ? (
                    <p className="mt-1 text-xs text-rose-500">{serviceError}</p>
                  ) : null}

                  {isLocationOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-[420px] max-w-[95vw] rounded-md border border-brand-line bg-white p-5 shadow-float">
                      <p className="text-xs font-semibold text-brand-muted">Delivery location</p>
                      <p className="mt-1 text-sm font-medium text-brand-ink">{locationLabel}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={handleDetectLocation}
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-green px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                        >
                          Detect my location
                        </button>
                        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">- or -</span>
                        <button
                          type="button"
                          onClick={() => placeElementRef.current?.focus?.()}
                          className="inline-flex items-center justify-center rounded-md border border-brand-line px-3 py-2 text-xs font-semibold text-brand-ink transition hover:border-brand-yellow/70"
                        >
                          Choose location
                        </button>
                      </div>
                      {geoStatus === "loading" && (
                        <p className="mt-2 text-xs text-brand-muted">Detecting location...</p>
                      )}
                      {geoStatus === "error" && (
                        <p className="mt-2 text-xs text-rose-500">Could not detect location.</p>
                      )}

                      <div className="mt-4 space-y-2">
                        <label className="text-xs font-semibold text-brand-muted">Choose location</label>
                        <div
                          ref={placeContainerRef}
                          className="places-autocomplete w-full rounded-md bg-transparent px-0 py-0 text-sm text-brand-ink outline-none"
                        />
                      </div>

                      <div className="mt-5">
                        <p className="text-xs font-semibold text-brand-muted">Your saved addresses</p>
                        {addressError && <p className="mt-2 text-xs text-rose-500">{addressError}</p>}
                        {isAddressLoading ? (
                          <p className="mt-2 text-xs text-slate-500">Loading addresses...</p>
                        ) : addresses.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">No saved addresses yet.</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {addresses.map((address) => (
                              <AddressCard
                                key={address.id ?? `${address.label}-${address.address_line}`}
                                data={address}
                                isDefault={defaultAddressId === address.id}
                                onSetDefault={handleSetDefaultAddress}
                                onSelect={handleSelectAddress}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          <div className="hidden w-full items-center gap-3 lg:flex lg:flex-1">
            <div
              className={cn(
                "flex-1 min-w-0 transition-all duration-300 ease-out",
                isSearchFocused ? "lg:max-w-full" : "lg:max-w-[420px]"
              )}
            >
              <SearchBar
                compact
                inputId="global-grocery-search"
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                  disableDropdown
                  onSuggestionsChange={handleSearchSuggestions}
                  className={isSearchFocused ? "lg:min-w-full" : ""}
                />
              </div>
              <div className="hidden shrink-0 items-center gap-2 lg:ml-auto lg:flex">
                {!isSearchFocused && (
                  user ? (
                    <div className="relative" ref={accountRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAccountOpen((prev) => !prev);
                          setIsLocationOpen(false);
                        }}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-line bg-white px-3 text-left text-sm shadow-card transition hover:border-brand-yellow/70"
                        aria-label="Open account menu"
                        aria-expanded={isAccountOpen}
                      >
                        <UserRound className="h-4 w-4 text-brand-ink" />
                        <div className="hidden lg:block">
                          <p className="text-[10px] text-brand-muted">Signed in</p>
                          <p className="text-xs font-medium leading-tight text-brand-ink">{accountLabel}</p>
                        </div>
                      </button>

                      {isAccountOpen && (
                        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-brand-line bg-white p-3 shadow-float">
                          <div className="border-b border-brand-line pb-3">
                            <p className="text-sm font-semibold text-brand-ink">My Account</p>
                            <p className="mt-1 text-xs text-brand-muted">{user.phone || "7302667115"}</p>
                          </div>
                          <div className="mt-3 space-y-1 text-sm text-brand-ink">
                            <Link href="/account/orders" className="block rounded-md px-3 py-2 hover:bg-brand-cream">
                              My Orders
                            </Link>
                            <Link href="/profile/addresses" className="block rounded-md px-3 py-2 hover:bg-brand-cream">
                              Saved Addresses
                            </Link>
                            <Link href="/faq" className="block rounded-md px-3 py-2 hover:bg-brand-cream">
                              FAQs
                            </Link>
                            <Link href="/account/privacy" className="block rounded-md px-3 py-2 hover:bg-brand-cream">
                              Account Privacy
                            </Link>
                            <button
                              type="button"
                              onClick={logout}
                              className="flex w-full items-center rounded-md px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                            >
                              Log Out
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuth("account")}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-line bg-white px-3 text-left text-sm shadow-card transition hover:border-brand-yellow/70"
                      aria-label="Sign in"
                    >
                      <UserRound className="h-4 w-4 text-brand-muted" />
                      <div className="hidden lg:block">
                        <p className="text-[10px] text-brand-muted">Account</p>
                        <p className="text-xs font-medium leading-tight text-brand-ink">{accountLabel}</p>
                      </div>
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={openCart}
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-yellow text-brand-ink shadow-card transition hover:brightness-95"
                  aria-label="Open cart drawer"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-ink px-1 text-[10px] font-bold text-white">
                    {itemCount}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <Suspense fallback={null}>
          <TopLoadingBar />
        </Suspense>
      </header>
      {isSearchFocused && (
        <div className="fixed inset-x-0 top-[72px] bottom-0 z-40 bg-white pt-8">
          <div className="site-container flex flex-col gap-6">
            <div className="lg:hidden">
              <SearchBar
                compact
                inputId="global-grocery-search-mobile"
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                disableDropdown
                onSuggestionsChange={handleSearchSuggestions}
              />
            </div>
            <div className="min-h-[220px]">
              {searchLoading ? (
                <div className="rounded-2xl border border-brand-line/70 bg-slate-50 p-6 text-sm text-slate-500 shadow-sm">
                  Searching for products…
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-brand-line/70 bg-slate-50 p-8 text-sm text-slate-500 shadow-sm">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl text-brand-muted shadow-sm">
                    🛒
                  </span>
                  <p className="text-sm font-semibold text-brand-ink">Search for products</p>
                  <p className="text-xs text-slate-500">Type something to see quick results</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {searchResults.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/product/${product.slug}`}
                        className="flex items-center gap-3 rounded-2xl border border-brand-line/70 bg-white px-4 py-3 text-sm text-brand-ink transition hover:border-brand-yellow/70 hover:bg-slate-50"
                        onClick={() => setIsSearchFocused(false)}
                      >
                        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-brand-line bg-slate-100">
                          <Image src={product.image} alt={product.name} fill sizes="48px" className="object-cover" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate font-semibold">{product.name}</p>
                          <p className="truncate text-xs text-slate-500">
                            ₹{product.price.toFixed(0)} · {product.weight}
                          </p>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-muted">View</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
