/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { AccountShell } from "@/components/AccountShell";
import { AddressCard, AddressCardData } from "@/components/AddressCard";
import { useAuth } from "@/context/AuthContext";

const EMPTY_FORM = {
  label: "",
  name: "",
  phone: "",
  house_no: "",
  building_name: "",
  floor: "",
  area: "",
  landmark: ""
};

export default function AddressesPage() {
  const { user, token, openAuth } = useAuth();
  const [addresses, setAddresses] = useState<AddressCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [defaultAddressId, setDefaultAddressId] = useState<number | null>(null);
  const storageKey = "quickbasket-default-address";
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState({
    label: false,
    building_name: false,
    area: false,
    landmark: false,
    name: false
  });
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "";
  const scriptPromiseRef = useRef<Promise<void> | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const placeContainerRef = useRef<HTMLDivElement | null>(null);
  const placeElementRef = useRef<any>(null);
  const [isMapsReady, setIsMapsReady] = useState(false);
  const [mapAddressLabel, setMapAddressLabel] = useState("");
  const [pendingAddressQuery, setPendingAddressQuery] = useState<string | null>(null);

  const modalTitle = useMemo(() => (editingAddressId ? "Edit address" : "Add new address"), [editingAddressId]);

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

  useEffect(() => {
    if (!user) {
      return;
    }
    if (!token) {
      setError("Please sign in again to manage addresses.");
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch("/wp-json/app/v1/user-addresses", {
      headers: {
        Authorization: `Bearer ${token}`
      },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load addresses");
        }
        const data = (await response.json()) as AddressCardData[];
        setAddresses(Array.isArray(data) ? data : []);
      })
      .catch((fetchError) => {
        if (fetchError?.name === "AbortError") {
          return;
        }
        setError("Unable to load saved addresses.");
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [token, user]);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) {
        setDefaultAddressId(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (isFormOpen) {
      return;
    }
    mapInstanceRef.current = null;
    markerRef.current = null;
    placeElementRef.current = null;
    setMapAddressLabel("");
    setPendingAddressQuery(null);
  }, [isFormOpen]);

  useEffect(() => {
    if (!isFormOpen || !googleApiKey) {
      return;
    }

    loadGoogleScript()
      .then(() => setIsMapsReady(true))
      .catch(() => setIsMapsReady(false));
  }, [googleApiKey, isFormOpen]);

  useEffect(() => {
    if (!isMapsReady || !isFormOpen || !mapContainerRef.current || mapInstanceRef.current) {
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

      const initialCenter = { lat: 28.6139, lng: 77.209 };
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
        reverseGeocode({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });

      marker.addListener("dragend", () => {
        const position = marker.getPosition();
        if (!position) {
          return;
        }
        reverseGeocode({ lat: position.lat(), lng: position.lng() });
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latLng = { lat: position.coords.latitude, lng: position.coords.longitude };
            map.setCenter(latLng);
            marker.setPosition(latLng);
            reverseGeocode(latLng);
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
  }, [isMapsReady, isFormOpen]);

  useEffect(() => {
    if (!isMapsReady || !isFormOpen || !placeContainerRef.current || placeElementRef.current) {
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
  }, [isMapsReady, isFormOpen]);

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
      if (results[0].address_components) {
        applyAddressFromComponents(results[0].address_components, results[0].formatted_address);
      }
      setPendingAddressQuery(null);
    });
  }, [isMapsReady, pendingAddressQuery]);

  const handleDelete = async (address: AddressCardData) => {
    if (!address.id || !token) {
      return;
    }

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
    } catch {
      setError("Unable to delete address.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Please sign in again to manage addresses.");
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
      setError("Please fill all required address fields.");
      return;
    }
    setValidationErrors({
      label: false,
      building_name: false,
      area: false,
      landmark: false,
      name: false
    });

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        address_line: [form.house_no, form.building_name, form.area, form.landmark].filter(Boolean).join(", "),
        city: form.area
      };

      const endpoint = editingAddressId
        ? `/wp-json/app/v1/address/${editingAddressId}`
        : "/wp-json/app/v1/user-addresses";
      const method = editingAddressId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = (await response.json()) as AddressCardData & { error?: string; updated?: boolean };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to save address.");
      }

      if (editingAddressId) {
        setAddresses((current) =>
          current.map((item) => (item.id === editingAddressId ? { ...item, ...payload } : item))
        );
      } else {
        setAddresses((current) => [result, ...current]);
        if (result.id) {
          setDefaultAddressId(result.id);
          window.localStorage.setItem(storageKey, result.id.toString());
        }
      }
      setForm(EMPTY_FORM);
      setIsFormOpen(false);
      setEditingAddressId(null);
        setValidationErrors({
          label: false,
          building_name: false,
          area: false,
          landmark: false,
          name: false
        });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save address.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = (address: AddressCardData) => {
    if (!address.id) {
      return;
    }
    setDefaultAddressId(address.id);
    window.localStorage.setItem(storageKey, address.id.toString());
  };

  const handleEdit = (address: AddressCardData) => {
    setEditingAddressId(address.id ?? null);
    setForm({
      label: address.label ?? "",
      name: address.name ?? "",
      phone: address.phone ?? "",
      house_no: address.house_no ?? "",
      building_name: address.building_name ?? "",
      floor: address.floor ?? "",
      area: address.area ?? "",
      landmark: address.landmark ?? ""
    });
    setValidationErrors({
      label: false,
      building_name: false,
      area: false,
      landmark: false,
      name: false
    });
    if (address.address_line) {
      setMapAddressLabel(address.address_line);
    }
    const query = [address.house_no, address.building_name, address.area, address.landmark]
      .filter(Boolean)
      .join(", ");
    if (query) {
      setPendingAddressQuery(query);
    }
    setIsFormOpen(true);
  };

  return (
    <AccountShell
      title="My addresses"
      action={
        user ? (
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(true);
              setForm({
                ...EMPTY_FORM,
                name: user.name || "",
                phone: user.phone || ""
              });
              setEditingAddressId(null);
              setPendingAddressQuery(null);
              setMapAddressLabel("");
              setValidationErrors({
                label: false,
                building_name: false,
                area: false,
                landmark: false,
                name: false
              });
            }}
            className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            + Add new address
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openAuth("account")}
            className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
          >
            Sign in to add address
          </button>
        )
      }
    >
      {!user ? (
        <div className="surface-panel px-6 py-10 text-center">
          <p className="text-sm text-slate-500">Sign in to manage your saved addresses.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {isFormOpen ? (
            <>
              <div className="fixed inset-0 z-50 bg-black/40" aria-hidden="true" />
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-5xl rounded-md bg-white shadow-float">
                  <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold text-brand-ink">{modalTitle}</p>
                      {mapAddressLabel ? (
                        <p className="mt-1 text-xs text-brand-muted">{mapAddressLabel}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        setEditingAddressId(null);
                        setForm(EMPTY_FORM);
                        setMapAddressLabel("");
                      }}
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
                      <p className="text-xs text-slate-500">
                        Tap on the map or drag the pin to fill the address fields.
                      </p>
                    </div>
                    <form onSubmit={handleSubmit} className="flex h-[520px] flex-col">
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
                      </div>
                      <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsFormOpen(false);
                            setEditingAddressId(null);
                            setForm(EMPTY_FORM);
                            setMapAddressLabel("");
                            setValidationErrors({
                              label: false,
                              building_name: false,
                              area: false,
                              landmark: false,
                              name: false
                            });
                          }}
                          className="inline-flex h-10 items-center justify-center rounded-md border border-brand-line px-4 text-sm font-semibold text-brand-ink transition hover:border-brand-green"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="inline-flex h-10 items-center justify-center rounded-md bg-brand-green px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
                        >
                          {isSaving ? "Saving..." : editingAddressId ? "Update address" : "Save address"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          {error ? <p className="text-xs text-rose-500">{error}</p> : null}
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading addresses...</p>
          ) : addresses.length === 0 ? (
            <div className="surface-panel px-6 py-10 text-center">
              <p className="text-sm text-slate-500">No saved addresses yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  data={address}
                  isDefault={defaultAddressId === address.id}
                  onSetDefault={handleSetDefault}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AccountShell>
  );
}
