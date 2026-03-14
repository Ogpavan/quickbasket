"use client";

import Image from "next/image";
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
  payment_method_title?: string;
  date_created: string;
  date_paid?: string | null;
  date_completed?: string | null;
  discount_total?: string;
  shipping_total?: string;
  total_tax?: string;
  currency?: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  shipping?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  line_items?: Array<{
    id: number;
    product_id: number;
    name: string;
    quantity: number;
    total: string;
    subtotal?: string;
    price?: number;
    image?: string;
  }>;
}

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80";

function getStatusStyles(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-rose-50 text-rose-600 border-rose-200";
  }
  if (normalized === "processing" || normalized === "on-hold") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (normalized === "completed" || normalized === "delivered") {
    return "bg-emerald-50 text-emerald-600 border-emerald-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export function AccountOrdersPane() {
  const { user, openAuth, logout } = useAuth();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const heading = useMemo(() => {
    if (!orders.length) {
      return "No orders yet";
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

    const query = user.phone ? `phone=${encodeURIComponent(user.phone)}` : `customerId=${user.id ?? ""}`;
    fetch(`/api/orders?${query}`)
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
            const placedLabel = format(new Date(order.date_created), "EEE, dd MMM''yy, h:mm a");
            const thumbnails = (order.line_items ?? []).slice(0, 5);
            const itemCount = (order.line_items ?? []).reduce((sum, item) => sum + (item.quantity || 0), 0);
            const itemSubtotal = (order.line_items ?? []).reduce(
              (sum, item) => sum + Number(item.subtotal ?? item.total ?? 0),
              0
            );
            const itemTotal = (order.line_items ?? []).reduce((sum, item) => sum + Number(item.total ?? 0), 0);
            const discount = Math.max(itemSubtotal - itemTotal, 0);
            const shippingTotal = Number(order.shipping_total ?? 0);
            const handlingCharge = 0;
            const billTotal = Number(order.total ?? itemTotal + shippingTotal);
            const addressSource = order.shipping?.address_1 ? order.shipping : order.billing;
            const addressLine = addressSource
              ? [
                  `${addressSource.first_name ?? ""} ${addressSource.last_name ?? ""}`.trim(),
                  addressSource.address_1,
                  addressSource.address_2,
                  addressSource.city
                ]
                  .filter(Boolean)
                  .join(", ")
              : "Saved address";
            const arrivedAt =
              order.date_completed || order.date_paid || (order.status.toLowerCase() === "completed" ? order.date_created : "");

            const statusStyles = getStatusStyles(order.status);
            const isExpanded = expandedOrderId === order.id;

            return (
              <article
                key={order.id}
                className="rounded-md border border-brand-line bg-white p-3 shadow-sm transition hover:border-brand-yellow/70"
                role="button"
                tabIndex={0}
                onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpandedOrderId(isExpanded ? null : order.id);
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
                          className="h-9 w-9 rounded-full border border-white object-cover shadow-sm"
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
                {isExpanded ? (
                  <div className="mt-3 space-y-4 rounded-md border border-brand-line bg-brand-cream/60 p-3 text-sm text-brand-ink">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Order summary</p>
                      {arrivedAt ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Arrived at {format(new Date(arrivedAt), "h:mm a")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-slate-500">{itemCount} item{itemCount === 1 ? "" : "s"} in this order</p>
                    </div>

                    <div className="space-y-2">
                      {(order.line_items ?? []).map((item) => (
                        <div key={item.id} className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-brand-ink">{item.name}</p>
                            <p className="text-xs text-slate-500">
                              1 pc x {item.quantity}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-brand-ink">₹{item.total}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Bill details</p>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>MRP</span>
                        <span>₹{itemSubtotal.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Product discount</span>
                        <span className="text-emerald-600">-₹{discount.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Item total</span>
                        <span>₹{itemTotal.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Handling charge</span>
                        <span>{handlingCharge > 0 ? `+₹${handlingCharge}` : "FREE"}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Delivery charges</span>
                        <span>{shippingTotal > 0 ? `₹${shippingTotal.toFixed(0)}` : "FREE"}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm font-semibold text-brand-ink">
                        <span>Bill total</span>
                        <span>₹{billTotal.toFixed(0)}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Order details</p>
                      <div className="flex items-start justify-between gap-3 text-xs text-slate-600">
                        <span>Order id</span>
                        <span className="text-right text-brand-ink">{order.id}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3 text-xs text-slate-600">
                        <span>Payment</span>
                        <span className="text-right text-brand-ink">
                          {order.payment_method_title ? order.payment_method_title : `Paid via ${order.payment_method.toUpperCase()}`}
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3 text-xs text-slate-600">
                        <span>Deliver to</span>
                        <span className="text-right text-brand-ink">{addressLine}</span>
                      </div>
                      <div className="flex items-start justify-between gap-3 text-xs text-slate-600">
                        <span>Order placed</span>
                        <span className="text-right text-brand-ink">Placed on {placedLabel}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
