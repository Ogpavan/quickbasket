"use client";

import Link from "next/link";

import { CartItem } from "@/components/CartItem";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { calculateCartTotals, formatPrice } from "@/lib/utils";

export function CartPageContent() {
  const { items, subtotal, clearCart } = useCart();
  const { user, openAuth } = useAuth();
  const totals = calculateCartTotals(subtotal);

  const handleCheckoutClick = () => {
    if (user) {
      return;
    }

    openAuth("checkout");
  };

  return (
    <section className="site-container page-section space-y-5">
      <div className="overflow-hidden rounded-xl bg-gradient-to-br from-brand-yellow via-amber-100 to-white p-5 shadow-card">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Basket</p>
        <h1 className="page-title mt-2">Your groceries</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Review quantities, remove products, and move to checkout when your basket is ready.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="surface-panel px-6 py-16 text-center">
          <h2 className="section-title">Your basket is empty</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            Start with essentials like milk, fruits, bread, and daily home supplies.
          </p>
          <Link
            href="/category/all"
            className="mt-8 inline-flex items-center justify-center rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-brand-ink">{items.length}</span> products in your basket
              </p>
              <button type="button" onClick={clearCart} className="text-sm font-semibold text-brand-green">
                Clear cart
              </button>
            </div>
            {items.map((item) => (
              <CartItem key={item.lineId} item={item} />
            ))}
          </div>

          <aside className="surface-panel h-fit p-5 lg:sticky lg:top-24">
            <h2 className="section-title">Price details</h2>
            <div className="mt-5 space-y-4 text-sm text-slate-500">
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
              <div className="flex items-center justify-between border-t border-dashed border-brand-line pt-4">
                <span className="text-lg font-bold text-brand-ink">Total</span>
                <span className="text-lg font-bold text-brand-ink">{formatPrice(totals.total)}</span>
              </div>
            </div>

            {user ? (
              <Link
                href="/checkout"
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Proceed to Checkout
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Login to Checkout
              </button>
            )}
            <p className="mt-3 text-xs text-slate-500">
              {user ? `Signed in as ${user.name}. COD orders will now be saved in WooCommerce.` : "Phone number sign-in is required before moving to checkout."}
            </p>
            <Link
              href="/category/all"
              className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
            >
              Add more items
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
