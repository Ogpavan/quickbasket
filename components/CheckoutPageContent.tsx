"use client";

import Link from "next/link";
import { CheckCircle2, House, MapPinned, NotebookPen, PackageCheck, WalletCards } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useDeliveryPricing } from "@/hooks/useDeliveryPricing";
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

interface CouponSummary {
  code: string;
  amount: number;
  discountType: string;
  individualUse: boolean;
  hasRestrictions: boolean;
}

function normalizePhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }

  return digits;
}

function sanitizeName(value: string) {
  return value
    .replace(/[^A-Za-z ]/g, "")
    .replace(/\s+/g, " ")
    .trimStart();
}

function isValidName(value: string) {
  return /^[A-Za-z]+(?: [A-Za-z]+)*$/.test(value.trim());
}

function sanitizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
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
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "checking" | "applied" | "error">("idle");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponSummary, setCouponSummary] = useState<CouponSummary | null>(null);
  const [taxRates, setTaxRates] = useState<Record<string, number>>({});
  const { distanceKm, feeConfig } = useDeliveryPricing();
  const totals = useMemo(
    () => calculateCartTotals(subtotal, { distanceKm, feeConfig }),
    [subtotal, distanceKm, feeConfig]
  );
  const taxClasses = useMemo(() => {
    const classes = items.map((item) => item.taxClass || "standard");
    return Array.from(new Set(classes));
  }, [items]);
  const estimatedCouponDiscount = useMemo(() => {
    if (!couponSummary || couponSummary.hasRestrictions) {
      return 0;
    }

    if (couponSummary.discountType === "percent") {
      return Math.round((subtotal * couponSummary.amount) / 100);
    }

    if (couponSummary.discountType === "fixed_cart") {
      return Math.min(couponSummary.amount, subtotal);
    }

    return 0;
  }, [couponSummary, subtotal]);
  const estimatedTax = useMemo(() => {
    if (taxClasses.length === 0) {
      return 0;
    }

    const rawTotal = items.reduce((sum, item) => {
      const taxClass = item.taxClass || "standard";
      const rate = taxRates[taxClass] ?? 0;
      return sum + (item.price * item.quantity * rate) / 100;
    }, 0);

    return Math.round(rawTotal);
  }, [items, taxClasses, taxRates]);
  const handlingFeeTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.handlingFee ?? 0) * item.quantity, 0);
  }, [items]);
  const displayTaxRate =
    taxClasses.length === 1 ? taxRates[taxClasses[0]] ?? 0 : 0;

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
    if (!isCartHydrated || items.length === 0) {
      return;
    }

    const lookupTaxRates = async () => {
      try {
        const response = await fetch("/api/tax/rates", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ classes: taxClasses })
        });
        const result = (await response.json()) as {
          rates?: Record<string, number>;
        };
        setTaxRates(result.rates ?? {});
      } catch {
        setTaxRates({});
      }
    };

    lookupTaxRates();
  }, [isCartHydrated, items.length, taxClasses]);

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
      const nextValue =
        field === "name"
          ? sanitizeName(event.target.value)
          : field === "phone"
            ? sanitizePhone(event.target.value)
            : event.target.value;
      setForm((currentForm) => ({
        ...currentForm,
        [field]: nextValue
      }));
    };

  const handleApplyCoupon = async () => {
    const trimmed = couponCode.trim();
    if (!trimmed) {
      setCouponStatus("error");
      setCouponMessage("Enter a coupon code first.");
      return;
    }

    setCouponStatus("checking");
    setCouponMessage("");

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ code: trimmed, subtotal })
      });
      const result = (await response.json()) as {
        valid?: boolean;
        message?: string;
        coupon?: {
          code: string;
          amount: string;
          discountType: string;
          individualUse?: boolean;
          hasRestrictions?: boolean;
        };
      };

      if (!response.ok || !result.valid || !result.coupon) {
        setCouponStatus("error");
        setCouponSummary(null);
        setCouponMessage(result.message ?? "Unable to apply this coupon.");
        return;
      }

      setCouponStatus("applied");
      setCouponSummary({
        code: result.coupon.code,
        amount: Number(result.coupon.amount || 0),
        discountType: result.coupon.discountType,
        individualUse: Boolean(result.coupon.individualUse),
        hasRestrictions: Boolean(result.coupon.hasRestrictions)
      });
      setCouponMessage(result.message ?? "Coupon applied.");
    } catch {
      setCouponStatus("error");
      setCouponSummary(null);
      setCouponMessage("Unable to validate the coupon right now.");
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode("");
    setCouponStatus("idle");
    setCouponMessage("");
    setCouponSummary(null);
  };

  const handlePlaceOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPhone = normalizePhoneNumber(form.phone);

    if (form.name.trim().length < 2 || !isValidName(form.name)) {
      setSubmitError("Enter a valid full name using alphabets only.");
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
        delivery: {
          distanceKm,
          feeConfig
        },
        items,
        notes: form.notes.trim(),
        couponCode: couponStatus === "applied" && couponCode.trim() ? couponCode.trim() : undefined
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
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-brand-green text-white">
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
              <div className="rounded-md bg-brand-mint/50 p-4">
                <p className="text-xs text-slate-500">Order ID</p>
                <p className="mt-1 text-lg font-bold text-brand-ink">#{orderResult.id}</p>
              </div>
              <div className="rounded-md bg-amber-50 p-4">
                <p className="text-xs text-slate-500">Payment method</p>
                <p className="mt-1 text-lg font-bold text-brand-ink">{orderResult.paymentMethod}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Customer</p>
                <p className="mt-1 text-sm font-medium text-brand-ink">{orderResult.customerName}</p>
                <p className="mt-1 text-xs text-slate-500">{orderResult.phone}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-4">
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
              <p className="rounded-md bg-brand-mint/50 p-4 text-sm leading-6 text-slate-600">
                Keep cash ready at delivery. The operations team can now see this order in WooCommerce.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/category/all"
                className="inline-flex w-full items-center justify-center rounded-md bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Continue shopping
              </Link>
              <Link
                href="/cart"
                className="inline-flex w-full items-center justify-center rounded-md border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
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
            className="mt-8 inline-flex items-center justify-center rounded-md bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
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
            className="mt-8 inline-flex items-center justify-center rounded-md bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Login with phone OTP
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="site-container page-section space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <form id="checkout-form" className="space-y-5" onSubmit={handlePlaceOrder}>
          <section className="surface-panel p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-mint text-brand-green">
                <House className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Customer details</h2>
                <p className="text-sm text-slate-500">Linked to your WooCommerce customer record.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-brand-ink">Full name</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={updateField("name")}
                  className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                  placeholder="Enter your full name"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-brand-ink">Phone number</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={updateField("phone")}
                  className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
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
                className="mt-2 h-12 w-full rounded-md border border-brand-line bg-slate-50 px-4 text-sm text-slate-600"
                placeholder="Customer email"
                readOnly
              />
            </label>
          </section>

          <section className="surface-panel p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                <MapPinned className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Delivery address</h2>
                <p className="text-sm text-slate-500">Used for billing and shipping.</p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-brand-ink">Address line 1</span>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={updateField("addressLine1")}
                  className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
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
                    className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="Area / apartment"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-ink">Landmark</span>
                  <input
                    type="text"
                    value={form.landmark}
                    onChange={updateField("landmark")}
                    className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
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
                    className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="City"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-ink">State</span>
                  <input
                    type="text"
                    value={form.state}
                    onChange={updateField("state")}
                    className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="State"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-brand-ink">Pincode</span>
                  <input
                    type="text"
                    value={form.postalCode}
                    onChange={updateField("postalCode")}
                    className="mt-2 h-12 w-full rounded-md border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-slate-400"
                    placeholder="6-digit pincode"
                    inputMode="numeric"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="surface-panel p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-sky-50 text-sky-700">
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
                className="mt-2 min-h-28 w-full rounded-md border border-brand-line bg-white px-4 py-3 text-sm text-brand-ink placeholder:text-slate-400"
                placeholder="Delivery gate code, floor number, or preferred drop instructions"
              />
            </label>
          </section>

          {submitError ? <p className="text-sm font-medium text-red-600">{submitError}</p> : null}

        </form>

        <aside className="space-y-5">
          <section className="surface-panel p-5 lg:sticky lg:top-24">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-yellow/80 text-brand-ink">
                <WalletCards className="h-5 w-5" />
              </span>
              <div>
                <h2 className="section-title">Order summary</h2>
                <p className="text-sm text-slate-500">Cash on Delivery</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-md border border-brand-line bg-white p-4">
              <p className="text-sm font-semibold text-brand-ink">Apply coupon</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  className="h-11 w-full rounded-md border border-brand-line bg-white px-3 text-sm text-brand-ink placeholder:text-slate-400"
                  placeholder="Enter coupon code"
                />
                {couponStatus === "applied" ? (
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="inline-flex h-11 items-center justify-center rounded-md border border-brand-line px-3 text-xs font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={couponStatus === "checking"}
                    className="inline-flex h-11 items-center justify-center rounded-md bg-brand-green px-4 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {couponStatus === "checking" ? "Applying..." : "Apply"}
                  </button>
                )}
              </div>
              {couponMessage ? (
                <p
                  className={`text-xs ${
                    couponStatus === "error" ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {couponMessage}
                </p>
              ) : null}
              {couponSummary?.hasRestrictions ? (
                <p className="text-xs text-slate-500">
                  This coupon has product or category restrictions. Final discount will be calculated at checkout.
                </p>
              ) : null}
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
              {couponSummary ? (
                <div className="flex items-center justify-between">
                  <span>Coupon ({couponSummary.code})</span>
                  <span className="text-sm font-semibold text-emerald-700">
                    {estimatedCouponDiscount > 0 ? `- ${formatPrice(estimatedCouponDiscount)}` : "Applied"}
                  </span>
                </div>
              ) : null}
              {totals.handlingFee > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Handling charge</span>
                  <span className="text-sm font-semibold text-brand-ink">{formatPrice(totals.handlingFee)}</span>
                </div>
              ) : null}
              {handlingFeeTotal > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Item handling charge</span>
                  <span className="text-sm font-semibold text-brand-ink">{formatPrice(handlingFeeTotal)}</span>
                </div>
              ) : null}
              {estimatedTax > 0 ? (
                <div className="flex items-center justify-between">
                  <span>
                    {displayTaxRate > 0 ? `Estimated tax (${displayTaxRate}%)` : "Estimated tax"}
                  </span>
                  <span className="text-sm font-semibold text-brand-ink">
                    {formatPrice(estimatedTax)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span>Delivery fee</span>
                <span className="text-sm font-semibold text-brand-ink">
                  {totals.deliveryFee === 0 ? "Free" : formatPrice(totals.deliveryFee)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment</span>
                <span className="text-sm font-semibold text-brand-ink">Cash on Delivery</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-brand-line pt-3">
                <span className="text-lg font-bold text-brand-ink">Total payable</span>
                <span className="text-lg font-bold text-brand-ink">
                  {formatPrice(
                    Math.max(totals.total - estimatedCouponDiscount + estimatedTax + handlingFeeTotal, 0)
                  )}
                </span>
              </div>
              <button
                type="submit"
                form="checkout-form"
                disabled={isSubmitting}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Placing COD order..." : "Place COD order"}
              </button>
            </div>
          </section>

          
        </aside>
      </div>
    </section>
  );
}
