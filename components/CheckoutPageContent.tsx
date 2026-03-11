"use client";

import Link from "next/link";
import { CheckCircle2, House, MapPinned, NotebookPen, PackageCheck, WalletCards } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { calculateCartTotals, formatPrice } from "@/lib/utils";
import { CheckoutOrderResult, CheckoutPayload } from "@/types/checkout";

const CHECKOUT_STORAGE_KEY = "quickbasket-checkout";

interface CheckoutFormState {
  name: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  landmark: string;
  city: string;
  state: string;
  postalCode: string;
  notes: string;
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function buildPlaceholderEmail(phone: string) {
  const normalizedPhone = normalizePhoneNumber(phone);
  return normalizedPhone ? `${normalizedPhone}@quickbasket.local` : "";
}

const initialFormState: CheckoutFormState = {
  name: "",
  phone: "",
  email: "",
  addressLine1: "",
  addressLine2: "",
  landmark: "",
  city: "",
  state: "",
  postalCode: "",
  notes: ""
};

export function CheckoutPageContent() {
  const { items, subtotal, clearCart, isHydrated: isCartHydrated } = useCart();
  const { user, isHydrated: isAuthHydrated, openAuth } = useAuth();
  const [form, setForm] = useState<CheckoutFormState>(initialFormState);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<CheckoutOrderResult | null>(null);
  const totals = useMemo(() => calculateCartTotals(subtotal), [subtotal]);

  useEffect(() => {
    if (!isCartHydrated) {
      return;
    }

    const storedForm = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);

    if (!storedForm) {
      return;
    }

    try {
      const parsedForm = JSON.parse(storedForm) as Partial<CheckoutFormState>;
      setForm((currentForm) => ({
        ...currentForm,
        ...parsedForm
      }));
    } catch {
      window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    }
  }, [isCartHydrated]);

  useEffect(() => {
    if (!isCartHydrated) {
      return;
    }

    window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(form));
  }, [form, isCartHydrated]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      name: user.name || currentForm.name,
      phone: user.phone || currentForm.phone,
      email: user.email || buildPlaceholderEmail(user.phone)
    }));
  }, [user]);

  const updateField =
    (field: keyof CheckoutFormState) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value
      }));
    };

  const handlePlaceOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = normalizePhoneNumber(form.phone);

    if (form.name.trim().length < 2) {
      setSubmitError("Enter the customer's full name.");
      return;
    }

    if (normalizedPhone.length !== 10) {
      setSubmitError("Enter a valid 10-digit mobile number.");
      return;
    }

    if (!form.addressLine1.trim() || !form.city.trim() || !form.state.trim() || !/^\d{6}$/.test(form.postalCode.trim())) {
      setSubmitError("Complete the delivery address with a valid 6-digit pincode.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const payload: CheckoutPayload = {
        customer: {
          name: form.name.trim(),
          phone: normalizedPhone,
          email: form.email.trim() || buildPlaceholderEmail(normalizedPhone)
        },
        address: {
          addressLine1: form.addressLine1.trim(),
          addressLine2: form.addressLine2.trim(),
          landmark: form.landmark.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim()
        },
        items,
        notes: form.notes.trim()
      };
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = (await response.json()) as {
        error?: string;
        order?: CheckoutOrderResult;
      };

      if (!response.ok || !result.order) {
        setSubmitError(result.error ?? "We could not place the COD order right now.");
        return;
      }

      setOrderResult(result.order);
      clearCart();
      window.localStorage.removeItem(CHECKOUT_STORAGE_KEY);
    } catch {
      setSubmitError("We could not connect to WooCommerce. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isCartHydrated || !isAuthHydrated) {
    return (
      <section className="site-container page-section">
        <div className="surface-panel px-6 py-16 text-center">
          <p className="text-sm font-medium text-slate-500">Preparing checkout...</p>
        </div>
      </section>
    );
  }

  if (orderResult) {
    return (
      <section className="site-container page-section space-y-5">
        <div className="surface-panel overflow-hidden bg-gradient-to-br from-brand-mint via-white to-emerald-50 p-6">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-brand-green text-white">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h1 className="page-title mt-4">Order placed successfully</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Your COD order has been saved in WooCommerce and is ready for fulfillment.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-panel p-5">
            <h2 className="section-title">Order details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-brand-mint/50 p-4">
                <p className="text-xs text-slate-500">Order ID</p>
                <p className="mt-1 text-lg font-bold text-brand-ink">#{orderResult.id}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-xs text-slate-500">Payment method</p>
                <p className="mt-1 text-lg font-bold text-brand-ink">{orderResult.paymentMethod}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="mt-1 text-sm font-medium text-brand-ink">{orderResult.customerName}</p>
                <p className="mt-1 text-xs text-slate-500">{orderResult.phone}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Delivery address</p>
                <p className="mt-1 text-sm font-medium text-brand-ink">{orderResult.addressSummary}</p>
              </div>
            </div>
          </div>

          <aside className="surface-panel h-fit p-5">
            <h2 className="section-title">Next steps</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-500">
              <div className="flex items-center justify-between">
                <span>Order status</span>
                <span className="text-sm font-semibold capitalize text-brand-ink">{orderResult.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total payable</span>
                <span className="text-lg font-bold text-brand-ink">{formatPrice(orderResult.total)}</span>
              </div>
              <p className="rounded-xl bg-brand-mint/50 p-4 text-sm leading-6 text-slate-600">
                Keep cash ready at delivery. The operations team can now see this order in WooCommerce.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/category/all"
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Continue shopping
              </Link>
              <Link
                href="/cart"
                className="inline-flex w-full items-center justify-center rounded-lg border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
              >
                Back to cart
              </Link>
            </div>
          </aside>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="site-container page-section">
        <div className="surface-panel px-6 py-16 text-center">
          <h1 className="page-title">Your cart is empty</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            Add products to your basket before moving to checkout.
          </p>
          <Link
            href="/category/all"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Browse groceries
          </Link>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="site-container page-section">
        <div className="surface-panel px-6 py-16 text-center">
          <h1 className="page-title">Sign in to continue</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            Checkout is linked to a WooCommerce customer profile, so phone OTP sign-in is required first.
          </p>
          <button
            type="button"
            onClick={() => openAuth("checkout")}
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Login with phone OTP
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="site-container page-section space-y-5">
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-brand-yellow via-amber-100 to-white p-5 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Checkout</p>
        <h1 className="page-title mt-2">Confirm your COD order</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Delivery details and COD confirmation go to WooCommerce with this order. Products stay exactly as they appear in your cart.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <form className="space-y-5" onSubmit={handlePlaceOrder}>
          <section className="surface-panel p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-mint text-brand-green">
                <House className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Customer details</h2>
                <p className="text-sm text-slate-500">This profile is linked to your WooCommerce customer record.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-brand-ink">Full name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={updateField("name")}
                  className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                  placeholder="Enter your full name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-brand-ink">Phone number</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={updateField("phone")}
                  className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                  placeholder="Enter your 10-digit mobile number"
                  inputMode="tel"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-brand-ink">Customer email</span>
              <input
                type="email"
                value={form.email || buildPlaceholderEmail(form.phone)}
                className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-slate-50 px-4 text-sm text-slate-600"
                placeholder="Customer email"
                readOnly
              />
            </label>
          </section>

          <section className="surface-panel p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <MapPinned className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Delivery address</h2>
                <p className="text-sm text-slate-500">This address will be saved on the WooCommerce order.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-brand-ink">Address line 1</span>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={updateField("addressLine1")}
                  className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                  placeholder="House / flat / street"
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-brand-ink">Address line 2</span>
                  <input
                    type="text"
                    value={form.addressLine2}
                    onChange={updateField("addressLine2")}
                    className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="Area / apartment"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-ink">Landmark</span>
                  <input
                    type="text"
                    value={form.landmark}
                    onChange={updateField("landmark")}
                    className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="Nearby landmark"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-medium text-brand-ink">City</span>
                  <input
                    type="text"
                    value={form.city}
                    onChange={updateField("city")}
                    className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="City"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-ink">State</span>
                  <input
                    type="text"
                    value={form.state}
                    onChange={updateField("state")}
                    className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="State"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-ink">Pincode</span>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={updateField("postalCode")}
                    className="mt-2 h-12 w-full rounded-lg border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="6-digit pincode"
                    inputMode="numeric"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="surface-panel p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <NotebookPen className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Delivery notes</h2>
                <p className="text-sm text-slate-500">Optional instructions for the rider.</p>
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-brand-ink">Notes</span>
              <textarea
                value={form.notes}
                onChange={updateField("notes")}
                className="mt-2 min-h-28 w-full rounded-lg border border-brand-line bg-white px-4 py-3 text-sm text-brand-ink placeholder:text-slate-400"
                placeholder="Delivery gate code, floor number, or preferred drop instructions"
              />
            </label>
          </section>

          {submitError ? <p className="text-sm font-medium text-red-600">{submitError}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-6 py-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Placing COD order..." : "Place COD order"}
          </button>
        </form>

        <aside className="space-y-5">
          <section className="surface-panel p-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-yellow/80 text-brand-ink">
                <WalletCards className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Payment</h2>
                <p className="text-sm text-slate-500">Cash on Delivery only</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-brand-line bg-amber-50 p-4">
              <p className="text-sm font-medium text-brand-ink">COD enabled for every order</p>
              <p className="mt-2 text-xs leading-6 text-slate-600">
                Orders are saved in WooCommerce with `payment_method = cod` and remain unpaid until delivery.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div key={item.lineId} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-brand-ink">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.weight} x {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-brand-ink">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t border-dashed border-brand-line pt-4 text-sm text-slate-500">
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
              <div className="flex items-center justify-between">
                <span>Payment mode</span>
                <span className="text-sm font-semibold text-brand-ink">COD</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-brand-line pt-3">
                <span className="text-lg font-bold text-brand-ink">Total payable</span>
                <span className="text-lg font-bold text-brand-ink">{formatPrice(totals.total)}</span>
              </div>
            </div>
          </section>

          <section className="surface-panel p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-brand-mint text-brand-green">
                <PackageCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">What gets saved</h2>
                <p className="text-sm text-slate-500">Order data written into WooCommerce</p>
              </div>
            </div>

            <ul className="mt-5 space-y-3 text-sm text-slate-600">
              <li>Customer profile linked by phone-based placeholder email.</li>
              <li>Billing and shipping address from this form.</li>
              <li>Line items with quantity, product ID, brand, and pack size metadata.</li>
              <li>COD payment method and delivery fee.</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
