"use client";

import Image from "next/image";
import { ArrowLeft, WalletCards } from "lucide-react";
import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { AccountShell } from "@/components/AccountShell";
import { useAuth } from "@/context/AuthContext";
import { loadAccountOrders } from "@/lib/api/account-orders";
import { getStatusStyles } from "@/lib/order-utils";
import type { AccountOrder } from "@/types/order";

const FALLBACK_THUMBNAIL =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=80";

function formatAddress(order: AccountOrder) {
  const addressSource = order.shipping?.address_1 ? order.shipping : order.billing;
  if (!addressSource) {
    return "Saved address";
  }
  return [
    `${addressSource.first_name ?? ""} ${addressSource.last_name ?? ""}`.trim(),
    addressSource.address_1,
    addressSource.address_2,
    addressSource.city
  ]
    .filter(Boolean)
    .join(", ");
}

export default function AccountOrderDetailsPage({
  params
}: {
  params: { orderId: string };
}) {
  const { user, openAuth } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<AccountOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setOrder(null);
      setLoading(false);
      setError("");
      return;
    }

    const orderId = Number(params.orderId);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setOrder(null);
      setLoading(false);
      setError("Invalid order selected.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    loadAccountOrders({ user, signal: controller.signal })
      .then((orders) => {
        const match = orders.find((entry) => entry.id === orderId);
        if (match) {
          setOrder(match);
          return;
        }
        setError("We couldn't find that order.");
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        console.error("Order detail fetch failed", fetchError);
        setError("Could not load the order.");
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, [params.orderId, user]);

  const heading = useMemo(() => {
    if (!order) {
      return "Order details";
    }
    return `Order #${order.id}`;
  }, [order]);

  const thumbnails = order?.line_items?.slice(0, 6) ?? [];
  const itemCount = order?.line_items?.reduce((sum, item) => sum + (item.quantity || 0), 0) ?? 0;
  const itemSubtotal = order?.line_items?.reduce(
    (sum, item) => sum + Number(item.subtotal ?? item.total ?? 0),
    0
  ) ?? 0;
  const itemTotal = order?.line_items?.reduce((sum, item) => sum + Number(item.total ?? 0), 0) ?? 0;
  const discount = Math.max(itemSubtotal - itemTotal, 0);
  const shippingTotal = Number(order?.shipping_total ?? 0);
  const handlingCharge = 0;
  const billTotal = Number(order?.total ?? itemTotal + shippingTotal);
  const statusStyles = order ? getStatusStyles(order.status) : "bg-slate-50 text-slate-600 border-slate-200";
  const arrivedAt =
    order?.date_completed || order?.date_paid || (order?.status.toLowerCase() === "completed" ? order?.date_created : "");

  return (
    <AccountShell>
      <section className="page-section space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-md border border-brand-line px-3 py-2 text-sm font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Order</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-900">{heading}</h1>
          </div>
          <div />
        </div>

        {!user ? (
          <div className="rounded-md border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
            <WalletCards className="mx-auto h-6 w-6 text-brand-green" />
            <h2 className="mt-3 text-xl font-semibold text-slate-900">Sign in to view orders</h2>
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
        ) : loading ? (
          <p className="text-sm text-slate-500">Loading order…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !order ? (
          <p className="text-sm text-slate-600">Order not found.</p>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border border-brand-line bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  {thumbnails.length > 0 ? (
                    <div className="flex -space-x-2">
                      {thumbnails.map((item) => (
                        <Image
                          key={item.id}
                          src={(item.image as string) || FALLBACK_THUMBNAIL}
                          alt={item.name}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-full border border-white object-cover shadow-sm"
                        />
                      ))}
                    </div>
                  ) : null}
                  <div>
                    <p className="text-xs text-slate-500">Placed on {order.date_created && format(new Date(order.date_created), "MMM d, yyyy")}</p>
                    <p className="text-sm font-semibold text-brand-ink">{itemCount} item{itemCount === 1 ? "" : "s"}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase ${statusStyles}`}>
                  {order.status}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>Payment: {order.payment_method.toUpperCase()}</span>
                <span className="text-base font-semibold text-brand-ink">₹{order.total}</span>
              </div>
              {arrivedAt ? (
                <p className="mt-2 text-xs text-slate-500">Arrived at {format(new Date(arrivedAt), "h:mm a")}</p>
              ) : null}
            </div>

            <div className="space-y-4 rounded-md border border-brand-line bg-brand-cream/60 p-4 text-sm text-brand-ink">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Order summary</p>
                <p className="mt-1 text-xs text-slate-500">Order ID {order.id}</p>
              </div>

              <div className="space-y-2">
                {(order.line_items ?? []).map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-brand-ink">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        Qty {item.quantity} × ₹{item.price ?? 0}
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
                  <span>Payment</span>
                  <span className="text-right text-brand-ink">
                    {order.payment_method_title ? order.payment_method_title : `Paid via ${order.payment_method.toUpperCase()}`}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3 text-xs text-slate-600">
                  <span>Deliver to</span>
                  <span className="text-right text-brand-ink">{formatAddress(order)}</span>
                </div>
                <div className="flex items-start justify-between gap-3 text-xs text-slate-600">
                  <span>Order placed</span>
                  <span className="text-right text-brand-ink">
                    {order.date_created ? format(new Date(order.date_created), "EEE, dd MMM''yy, h:mm a") : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </AccountShell>
  );
}
