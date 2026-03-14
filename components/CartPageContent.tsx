"use client";

import Link from "next/link";

import { CartItem } from "@/components/CartItem";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useDeliveryPricing } from "@/hooks/useDeliveryPricing";
import { useNearestStore } from "@/hooks/useNearestStore";
import { calculateCartTotals, formatPrice } from "@/lib/utils";

export function CartPageContent() {
  const { items, subtotal, clearCart } = useCart();
  const { user, openAuth } = useAuth();
  const { distanceKm, feeConfig } = useDeliveryPricing();
  const { status: serviceStatus, error: serviceError } = useNearestStore();
  const totals = calculateCartTotals(subtotal, { distanceKm, feeConfig });
  const deliveryLines = totals.deliveryBreakdown?.lines ?? [];
  const hasDeliveryBreakdown = deliveryLines.length > 0;

  const handleCheckoutClick = () => {
    if (user) {
      return;
    }

    openAuth("checkout");
  };

  return (
    <section className="site-container page-section space-y-5">

      {items.length === 0 ? (
        <div className="surface-panel px-6 py-16 text-center">
          <h2 className="section-title">Your basket is empty</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-brand-muted">
            Start with essentials like milk, fruits, bread, and daily home supplies.
          </p>
          <Link
            href="/category/all"
            className="mt-8 inline-flex items-center justify-center rounded-md bg-brand-yellow px-6 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-95"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-brand-muted">
                <span className="font-semibold text-brand-ink">{items.length}</span> products in your basket
              </p>
              <button type="button" onClick={clearCart} className="text-sm font-semibold text-brand-ink">
                Clear cart
              </button>
            </div>
            {items.map((item) => (
              <CartItem key={item.lineId} item={item} />
            ))}
          </div>

          <aside className="surface-panel h-fit p-5 lg:sticky lg:top-24">
            <h2 className="section-title">Price details</h2>
            <div className="mt-5 space-y-4 text-sm text-brand-muted">
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
              <div className="flex items-center justify-between border-t border-dashed border-brand-line pt-4">
                <span className="text-lg font-bold text-brand-ink">Total</span>
                <span className="text-lg font-bold text-brand-ink">{formatPrice(totals.total)}</span>
              </div>
            </div>

            {serviceStatus === "unserviceable" ? (
              <button
                type="button"
                disabled
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-yellow/60 px-5 py-3 text-sm font-semibold text-brand-ink"
              >
                Service unavailable
              </button>
            ) : user ? (
              <Link
                href="/checkout"
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-5 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-95"
              >
                Proceed to Checkout
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-brand-yellow px-5 py-3 text-sm font-semibold text-brand-ink transition hover:brightness-95"
              >
                Login to Checkout
              </button>
            )}
            {serviceStatus === "unserviceable" ? (
              <p className="mt-2 text-xs text-rose-500">Service unavailable for the selected location.</p>
            ) : serviceStatus === "error" && serviceError ? (
              <p className="mt-2 text-xs text-rose-500">{serviceError}</p>
            ) : null}
            <p className="mt-3 text-xs text-brand-muted">
              {user ? `Signed in as ${user.name}. Orders will now be saved in WooCommerce.` : "Phone number sign-in is required before moving to checkout."}
            </p>
            <Link
              href="/category/all"
              className="mt-3 inline-flex w-full items-center justify-center rounded-md border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-yellow"
            >
              Add more items
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
