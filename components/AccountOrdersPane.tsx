"use client";

import Image from "next/image";
import { CalendarCheck, PackageCheck, WalletCards } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { loadAccountOrders } from "@/lib/api/account-orders";
import { getStatusStyles } from "@/lib/order-utils";
import type { AccountOrder } from "@/types/order";

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80";

export function AccountOrdersPane() {
  const { user, openAuth, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const heading = useMemo(() => {
    if (!orders.length) {
      return "No orders yet";
    }
    return "Your past orders";
  }, [orders.length]);

  useEffect(() => {
    if (!user?.id && !user?.phone) {
      setOrders([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    loadAccountOrders({ user, signal: controller.signal })
      .then((result) => {
        setOrders(result);
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        console.error("Account orders fetch failed", fetchError);
        setError("Could not load your orders.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-md border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
        <WalletCards className="mx-auto h-6 w-6 text-brand-green" />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">Sign in to view orders</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Orders are tied to your WooCommerce profile created via OTP.
        </p>
        <button
          type="button"
          onClick={() => openAuth("account")}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Login with phone OTP
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-brand-green" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Orders</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{heading}</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-md border border-brand-line px-3 py-2 text-xs font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
        >
          <PackageCheck className="h-4 w-4 text-brand-green" />
          Logout
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading your orders…</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : orders.length === 0 ? (
        <div className="rounded-md border border-dashed border-brand-line bg-slate-50 p-5 text-sm text-slate-500">
          No orders yet. Place an order to see it listed here once WooCommerce processes it.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const dateLabel = format(new Date(order.date_created), "MMM d, yyyy");
            const thumbnails = (order.line_items ?? []).slice(0, 5);
            const statusStyles = getStatusStyles(order.status);

            return (
              <article
                key={order.id}
                className="rounded-md border border-brand-line bg-white p-3 shadow-sm transition hover:border-brand-yellow/70 focus-within:border-brand-green focus-within:outline-none"
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/account/orders/${order.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(`/account/orders/${order.id}`);
                  }
                }}
              >
                {thumbnails.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-2">
                      {thumbnails.map((item) => (
                        <Image
                          key={item.id}
                          src={(item.image as string) || FALLBACK_THUMBNAIL}
                          alt={item.name}
                          width={40}
                          height={40}
                          className="h-9 w-9 rounded-full border border-white object-cover shadow-sm transition"
                          sizes="40px"
                        />
                      ))}
                    </div>
                    {(order.line_items?.length ?? 0) > thumbnails.length ? (
                      <span className="text-xs text-slate-500">
                        +{(order.line_items?.length ?? 0) - thumbnails.length} more
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">Placed on {dateLabel}</p>
                  <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase ${statusStyles}`}>
                    {order.status}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Payment: {order.payment_method.toUpperCase()}</span>
                  <span className="text-base font-semibold text-brand-ink">₹{order.total}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
