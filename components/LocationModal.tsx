"use client";

import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { AddressCard, AddressCardData } from "@/components/AddressCard";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToken: string;
  apiBaseUrl?: string;
  onSelectAddress?: (address: AddressCardData) => void;
  onEditAddress?: (address: AddressCardData) => void;
  onDeleteAddress?: (addressId: number) => void | Promise<void>;
  onDetectLocation?: () => void;
}

export function LocationModal({
  isOpen,
  onClose,
  userToken,
  apiBaseUrl,
  onSelectAddress,
  onEditAddress,
  onDeleteAddress,
  onDetectLocation
}: LocationModalProps) {
  const [addresses, setAddresses] = useState<AddressCardData[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressCardData | null>(null);
  const [defaultAddressId, setDefaultAddressId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const storageKey = "quickbasket-default-address";

  const buildUrl = (path: string) => {
    if (!apiBaseUrl) {
      return path;
    }
    return new URL(path, apiBaseUrl).toString();
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!userToken) {
      setError("Missing user token.");
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(buildUrl("/wp-json/app/v1/user-addresses"), {
      headers: {
        Authorization: `Bearer ${userToken}`
      },
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load addresses.");
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
      .finally(() => {
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [isOpen, userToken, apiBaseUrl]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) {
        setDefaultAddressId(parsed);
      }
    }
  }, [isOpen]);

  const filteredAddresses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return addresses;
    }
    return addresses.filter((address) =>
      [
        address.label,
        address.name,
        address.house_no,
        address.building_name,
        address.floor,
        address.area,
        address.landmark,
        address.address_line,
        address.city,
        address.phone
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalized))
    );
  }, [addresses, query]);

  const handleSelect = (address: AddressCardData) => {
    setSelectedAddress(address);
    if (address.id) {
      setDefaultAddressId(address.id);
      window.localStorage.setItem(storageKey, address.id.toString());
    }
    onSelectAddress?.(address);
    onClose();
  };

  const handleDelete = async (address: AddressCardData) => {
    if (!address.id) {
      return;
    }

    try {
      if (onDeleteAddress) {
        await onDeleteAddress(address.id);
      } else {
        const response = await fetch(buildUrl(`/wp-json/app/v1/address/${address.id}`), {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${userToken}`
          }
        });
        if (!response.ok) {
          throw new Error("Delete failed");
        }
      }

      setAddresses((current) => current.filter((item) => item.id !== address.id));
      if (address.id && defaultAddressId === address.id) {
        setDefaultAddressId(null);
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      setError("Unable to delete address.");
    }
  };

  const handleSetDefault = (address: AddressCardData) => {
    if (!address.id) {
      return;
    }
    setDefaultAddressId(address.id);
    window.localStorage.setItem(storageKey, address.id.toString());
  };

  const handleDetectLocation = () => {
    if (onDetectLocation) {
      onDetectLocation();
      return;
    }

    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setIsDetecting(false);
        onClose();
      },
      () => {
        setIsDetecting(false);
        setError("Unable to detect location.");
      }
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-[420px] rounded-[12px] bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-base font-semibold text-brand-ink">Change Location</Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    className="inline-flex h-10 shrink-0 items-center justify-center rounded-md bg-brand-green px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-70"
                    disabled={isDetecting}
                  >
                    {isDetecting ? "Detecting..." : "Detect my location"}
                  </button>
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="search delivery location"
                    className="h-10 flex-1 rounded-md border border-slate-200 px-3 text-sm text-brand-ink outline-none transition focus:border-brand-green"
                  />
                </div>

                <div className="mt-5">
                  <p className="text-sm font-semibold text-brand-ink">Your saved addresses</p>
                  {error ? <p className="mt-2 text-xs text-rose-500">{error}</p> : null}

                  <div className="mt-3 space-y-3">
                    {isLoading ? (
                      <p className="text-sm text-slate-500">Loading addresses...</p>
                    ) : filteredAddresses.length === 0 ? (
                      <p className="text-sm text-slate-500">No saved addresses found.</p>
                    ) : (
                      filteredAddresses.map((address) => (
                        <AddressCard
                          key={address.id ?? `${address.label}-${address.address_line}`}
                          data={address}
                          selected={selectedAddress?.id === address.id}
                          isDefault={defaultAddressId === address.id}
                          onSelect={handleSelect}
                          onSetDefault={handleSetDefault}
                          onEdit={onEditAddress}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
