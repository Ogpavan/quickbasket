"use client";

import Link from "next/link";
import { ChevronDown, MapPin, ShoppingCart, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { SearchBar } from "@/components/SearchBar";
import { TopLoadingBar } from "@/components/TopLoadingBar";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";

export function Header() {
  const { itemCount, openCart } = useCart();
  const { user, openAuth, logout } = useAuth();
  const accountLabel = user ? user.name.split(" ")[0] : "Sign in";
  const [locationLabel, setLocationLabel] = useState("Home");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [customLocation, setCustomLocation] = useState("");
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "error">("idle");
  const locationRef = useRef<HTMLDivElement | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("delivery-location");
    if (stored) {
      setLocationLabel(stored);
    }
  }, []);

  useEffect(() => {
    if (locationLabel) {
      window.localStorage.setItem("delivery-location", locationLabel);
    }
  }, [locationLabel]);

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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }

    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lng = position.coords.longitude.toFixed(4);
        setLocationLabel(`Lat ${lat}, Lng ${lng}`);
        setGeoStatus("idle");
        setIsLocationOpen(false);
      },
      () => {
        setGeoStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleApplyLocation = () => {
    const trimmed = customLocation.trim();
    if (!trimmed) {
      return;
    }

    setLocationLabel(trimmed);
    setCustomLocation("");
    setIsLocationOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-brand-line/80 bg-white/85 backdrop-blur-xl relative">
      <div className="w-full px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:gap-6">
          <div className="order-1 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-yellow text-lg font-bold text-brand-ink">
                Q
              </span>
              <div>
                <p className="text-lg font-bold text-brand-ink">QuickBasket</p>
                <p className="text-xs text-slate-500">groceries in minutes</p>
              </div>
            </Link>
          </div>

          <div className="order-2 ml-auto flex items-center gap-2 lg:order-4">

            {user ? (
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountOpen((prev) => !prev);
                    setIsLocationOpen(false);
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-lg border border-brand-line bg-white px-3 text-left shadow-sm transition hover:border-brand-yellowDeep"
                  aria-label="Open account menu"
                  aria-expanded={isAccountOpen}
                >
                  <UserRound className="h-4 w-4 text-brand-green" />
                  <div className="hidden lg:block">
                    <p className="text-xs text-slate-500">Signed in</p>
                    <p className="text-sm font-medium text-brand-ink">{accountLabel}</p>
                  </div>
                </button>

                {isAccountOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-brand-line bg-white p-3 shadow-xl">
                    <div className="border-b border-brand-line pb-3">
                      <p className="text-sm font-semibold text-brand-ink">My Account</p>
                      <p className="mt-1 text-xs text-slate-500">{user.phone || "7302667115"}</p>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-brand-ink">
                      <Link href="/account/orders" className="block rounded-lg px-3 py-2 hover:bg-slate-50">
                        My Orders
                      </Link>
                      <Link href="/profile/addresses" className="block rounded-lg px-3 py-2 hover:bg-slate-50">
                        Saved Addresses
                      </Link>
                      <Link href="/account/prescriptions" className="block rounded-lg px-3 py-2 hover:bg-slate-50">
                        My Prescriptions
                      </Link>
                      <Link href="/account/gift-cards" className="block rounded-lg px-3 py-2 hover:bg-slate-50">
                        E-Gift Cards
                      </Link>
                      <Link href="/faq" className="block rounded-lg px-3 py-2 hover:bg-slate-50">
                        FAQs
                      </Link>
                      <Link href="/account/privacy" className="block rounded-lg px-3 py-2 hover:bg-slate-50">
                        Account Privacy
                      </Link>
                      <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                      >
                        Log Out
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openAuth("account")}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-brand-line bg-white px-3 text-left shadow-sm transition hover:border-brand-yellowDeep"
                aria-label="Sign in"
              >
                <UserRound className="h-4 w-4 text-slate-500" />
                <div className="hidden lg:block">
                  <p className="text-xs text-slate-500">Account</p>
                  <p className="text-sm font-medium text-brand-ink">{accountLabel}</p>
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={openCart}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-green text-white shadow-sm transition hover:brightness-110"
              aria-label="Open cart drawer"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-yellow px-1 text-[10px] font-bold text-brand-ink">
                {itemCount}
              </span>
            </button>
          </div>

          <div className="order-3 w-full lg:order-2 lg:w-auto">
            <div className="relative" ref={locationRef}>
              <button
                type="button"
                onClick={() => {
                  setIsLocationOpen((prev) => !prev);
                  setIsAccountOpen(false);
                }}
                className="inline-flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-brand-line bg-white px-3 text-left shadow-sm transition hover:border-brand-yellowDeep lg:w-auto lg:justify-start"
                aria-label="Delivery location"
                aria-expanded={isLocationOpen}
              >
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-brand-green" />
                  <span className="hidden sm:block">
                    <span className="text-xs text-slate-500">Delivering to</span>
                    <span className="block text-sm font-medium text-brand-ink">{locationLabel}</span>
                  </span>
                  <span className="text-sm font-medium text-brand-ink sm:hidden">{locationLabel}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {isLocationOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-brand-line bg-white p-4 shadow-xl">
                  <p className="text-xs font-semibold text-slate-500">Delivery location</p>
                  <p className="mt-1 text-sm font-medium text-brand-ink">{locationLabel}</p>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-line bg-white px-3 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-yellowDeep"
                  >
                    Detect my location
                  </button>
                  {geoStatus === "loading" ? (
                    <p className="mt-2 text-xs text-slate-500">Detecting location...</p>
                  ) : null}
                  {geoStatus === "error" ? (
                    <p className="mt-2 text-xs text-rose-500">Could not detect location.</p>
                  ) : null}

                  <div className="mt-4 space-y-2">
                    <label className="text-xs font-semibold text-slate-500">Choose location</label>
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(event) => setCustomLocation(event.target.value)}
                      placeholder="Enter area, street, or landmark"
                      className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm text-brand-ink outline-none transition focus:border-brand-yellowDeep"
                    />
                    <button
                      type="button"
                      onClick={handleApplyLocation}
                      className="inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                      Use this location
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="order-4 w-full lg:order-3 lg:flex-1 lg:max-w-[560px]">
            <SearchBar compact inputId="global-grocery-search" />
          </div>
        </div>
      </div>
      <TopLoadingBar />
    </header>
  );
}
