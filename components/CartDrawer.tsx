"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect } from "react";

import { CartItem } from "@/components/CartItem";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { calculateCartTotals, cn, formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const { items, subtotal, isCartOpen, closeCart } = useCart();
  const { user, openAuth } = useAuth();
  const totals = calculateCartTotals(subtotal);

  const handleCheckoutClick = () => {
    if (user) {
      return;
    }

    closeCart();
    openAuth("checkout");
  };

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCartOpen]);

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
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Your cart</p>
            <h2 className="mt-1 text-xl font-semibold text-brand-ink">{items.length} items</h2>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand-line text-slate-600 transition hover:border-brand-green hover:text-brand-green"
            aria-label="Close cart drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl bg-brand-mint px-6 text-center">
              <h3 className="text-xl font-semibold text-brand-ink">Your cart is empty</h3>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
                Add essentials to your basket and we will have them on the way in minutes.
              </p>
            </div>
          ) : (
            items.map((item) => <CartItem key={item.lineId} item={item} compact />)
          )}
        </div>

        <div className="border-t border-brand-line px-5 py-5">
          <div className="mb-4 space-y-2 text-sm text-slate-500">
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
            <div className="flex items-center justify-between border-t border-dashed border-brand-line pt-2">
              <span className="text-lg font-bold text-brand-ink">Total</span>
              <span className="text-lg font-bold text-brand-ink">{formatPrice(totals.total)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {user ? `Signed in as ${user.name}. Orders will be placed with Cash on Delivery.` : "Sign in with your phone number before checkout."}
            </p>
            {user ? (
              <Link
                href="/checkout"
                onClick={closeCart}
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Proceed to Checkout
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Login to Checkout
              </button>
            )}
            <Link
              href="/cart"
              onClick={closeCart}
              className="inline-flex w-full items-center justify-center rounded-lg border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
            >
              View full cart
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
