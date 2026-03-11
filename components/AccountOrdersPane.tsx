"use client";

import Link from "next/link";
import { CalendarCheck, PackageCheck, WalletCards } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";

interface AccountOrder {
  id: number;
  status: string;
  total: string;
  payment_method: string;
  date_created: string;
  line_items?: Array<{
    id: number;
    product_id: number;
    name: string;
    quantity: number;
    total: string;
    image?: string;
  }>;
}

export function AccountOrdersPane() {
  const { user, openAuth, logout } = useAuth();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const heading = useMemo(() => {
    if (!orders.length) {
      return "No COD orders yet";
    }
    return "Your past orders";
  }, [orders.length]);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError("");

    fetch(`/api/orders?customerId=${user.id}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.orders) {
          setOrders(result.orders);
          return;
        }
        throw new Error(result.error ?? "Unable to load orders");
      })
      .catch((fetchError) => {
        console.error("Account orders fetch failed", fetchError);
        setError("Could not load your orders.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  if (!user) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
        <WalletCards className="mx-auto h-6 w-6 text-brand-green" />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">Sign in to view orders</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Orders are tied to your WooCommerce profile created via OTP.
        </p>
        <button
          type="button"
          onClick={() => openAuth("account")}
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-green px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
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
          className="inline-flex items-center gap-2 rounded-lg border border-brand-line px-3 py-2 text-xs font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
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
        <div className="rounded-xl border border-dashed border-brand-line bg-slate-50 p-5 text-sm text-slate-500">
          No orders yet. Place a COD order to see it listed here once WooCommerce processes it.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const dateLabel = format(new Date(order.date_created), "MMM d, yyyy");
            const thumbnails = (order.line_items ?? []).filter((item) => item.image).slice(0, 5);

            return (
              <article key={order.id} className="rounded-xl border border-brand-line bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">Order #{order.id}</p>
                    <p className="text-xs text-slate-500">Placed on {dateLabel}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-green uppercase">{order.status}</span>
                </div>
                {thumbnails.length > 0 ? (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {thumbnails.map((item) => (
                        <img
                          key={item.id}
                          src={item.image}
                          alt={item.name}
                          className="h-10 w-10 rounded-lg border border-white object-cover shadow-sm"
                          loading="lazy"
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
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <span>Payment: {order.payment_method.toUpperCase()}</span>
                  <span className="text-base font-semibold text-brand-ink">₹{order.total}</span>
                </div>
                <Link
                  href="/checkout"
                  className="mt-4 inline-flex items-center justify-center rounded-lg border border-brand-line px-4 py-2 text-xs font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
                >
                  Reorder (coming soon)
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
