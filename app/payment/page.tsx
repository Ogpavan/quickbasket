"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, QrCode } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AddressCardData } from "@/components/AddressCard";
import { useCart } from "@/context/CartContext";
import { DeliveryFeeConfig } from "@/lib/delivery";
import { calculateCartTotals, formatPrice } from "@/lib/utils";
import { CartLineItem } from "@/types/product";

interface PaymentPayload {
  address: AddressCardData;
  items: CartLineItem[];
  totals?: {
    subtotal: number;
    deliveryFee: number;
    handlingFee?: number;
    total: number;
  };
  delivery?: {
    distanceKm?: number;
    feeConfig?: DeliveryFeeConfig | null;
  };
}

export default function PaymentPage() {
  const router = useRouter();
  const { clearCart } = useCart();
  const [payload, setPayload] = useState<PaymentPayload | null>(null);
  const [method, setMethod] = useState("upi");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
  const currency = process.env.NEXT_PUBLIC_STORE_CURRENCY ?? "INR";

  useEffect(() => {
    const stored = window.localStorage.getItem("quickbasket-payment");
    if (!stored) {
      return;
    }
    try {
      setPayload(JSON.parse(stored) as PaymentPayload);
    } catch {
      setPayload(null);
    }
  }, []);

  const totals = useMemo(() => {
    if (!payload) {
      return calculateCartTotals(0);
    }
    if (payload.totals) {
      return payload.totals;
    }
    const subtotal = payload.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return calculateCartTotals(subtotal, {
      distanceKm: payload.delivery?.distanceKm,
      feeConfig: payload.delivery?.feeConfig
    });
  }, [payload]);

  if (!payload) {
    return (
      <div className="site-container py-10">
        <div className="rounded-md border border-brand-line bg-white p-6 text-center">
          <p className="text-sm text-slate-500">No order details found. Start checkout from the cart.</p>
        </div>
      </div>
    );
  }

  const addressLine = [
    payload.address.name,
    payload.address.house_no,
    payload.address.building_name,
    payload.address.floor ? `Floor ${payload.address.floor}` : null,
    payload.address.area,
    payload.address.landmark,
    payload.address.address_line,
    payload.address.city
  ]
    .filter(Boolean)
    .join(", ");

  const loadRazorpayScript = () =>
    new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") {
        reject(new Error("Razorpay is unavailable on the server."));
        return;
      }
      if ((window as any).Razorpay) {
        resolve();
        return;
      }
      const existingScript = document.getElementById("razorpay-checkout") as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay.")));
        return;
      }
      const script = document.createElement("script");
      script.id = "razorpay-checkout";
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load Razorpay."));
      document.body.appendChild(script);
    });

  const handlePay = async () => {
    if (!payload) {
      return;
    }

    if (method === "cod") {
      setPaymentError("");
      const checkoutDraft = {
        name: payload.address.name ?? "",
        phone: payload.address.phone ?? "",
        email: payload.address.phone ? `${payload.address.phone}@quickbasket.local` : "",
        addressLine1:
          [payload.address.house_no, payload.address.building_name].filter(Boolean).join(", ") ||
          payload.address.address_line ||
          "",
        addressLine2: payload.address.area ?? "",
        landmark: payload.address.landmark ?? "",
        city: payload.address.city ?? payload.address.area ?? "",
        state: "",
        postalCode: "",
        notes: ""
      };
      window.localStorage.setItem("quickbasket-checkout", JSON.stringify(checkoutDraft));
      router.push("/checkout");
      return;
    }

    if (!razorpayKey) {
      setPaymentError("Payment gateway is not configured.");
      return;
    }

    setIsProcessing(true);
    setPaymentError("");

    try {
      await loadRazorpayScript();

      const amountInPaise = Math.max(Math.round(totals.total * 100), 10);
      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency,
          receipt: `QB-${Date.now()}`,
          notes: {
            address: addressLine,
            method
          }
        })
      });

      const orderResult = (await orderResponse.json()) as {
        id?: string;
        amount?: number;
        currency?: string;
        error?: string;
      };

      if (!orderResponse.ok || !orderResult.id) {
        throw new Error(orderResult.error ?? "Unable to start the payment.");
      }

      const prefillEmail = payload.address.phone ? `${payload.address.phone}@quickbasket.local` : "";
      const selectedInstruments = method === "upi" ? [{ method: "upi" }] : [{ method: "card" }];

      const options = {
        key: razorpayKey,
        amount: orderResult.amount ?? amountInPaise,
        currency: orderResult.currency ?? currency,
        name: "Quickbasket",
        description: "Order payment",
        order_id: orderResult.id,
        prefill: {
          name: payload.address.name ?? "",
          email: prefillEmail,
          contact: payload.address.phone ?? ""
        },
        notes: {
          address: addressLine
        },
        config: {
          display: {
            blocks: {
              preferred: {
                name: method === "upi" ? "UPI" : "Cards",
                instruments: selectedInstruments
              }
            },
            sequence: ["block.preferred"],
            preferences: {
              show_default_blocks: false
            }
          }
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const verifyResponse = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ...response,
              orderId: orderResult.id,
              method,
              checkout: payload
            })
          });
          const verifyResult = (await verifyResponse.json()) as {
            verified?: boolean;
            order?: { id: number };
            error?: string;
          };

          if (!verifyResponse.ok || !verifyResult.verified || !verifyResult.order) {
            setPaymentError(verifyResult.error ?? "Payment verified but order creation failed.");
            return;
          }

          setPaymentSuccess(true);
          clearCart();
          window.localStorage.removeItem("quickbasket-payment");
        },
        theme: {
          color: "#16a34a"
        }
      };

      const RazorpayConstructor = (window as any).Razorpay;
      const paymentObject = new RazorpayConstructor(options);
      paymentObject.on("payment.failed", (failure: any) => {
        setPaymentError(failure?.error?.description ?? "Payment failed. Try again.");
      });
      paymentObject.open();
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Payment failed. Try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="site-container py-10">
        <div className="mx-auto max-w-lg rounded-md border border-brand-line bg-white p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-muted">Payment received</p>
          <h1 className="mt-2 text-2xl font-semibold text-brand-ink">Thanks for your order!</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your Razorpay test payment was successful. We will share updates shortly.
          </p>
          <Link
            href="/category/all"
            className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="site-container py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-muted">Payment</p>
          <h1 className="mt-1 text-2xl font-semibold text-brand-ink">Choose payment method</h1>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr] lg:items-start">
          <div className="space-y-5">
            <div className="rounded-md border border-brand-line bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Delivery option</p>
              <p className="mt-2 text-sm font-semibold text-brand-ink">{payload.address.label ?? "Selected address"}</p>
              <p className="mt-1 text-xs text-slate-500">{addressLine}</p>
            </div>

            <div className="rounded-md border border-brand-line bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Payment options</p>
              <div className="mt-3 space-y-3">
                {[
                  { value: "upi", label: "UPI", icon: QrCode },
                  { value: "card", label: "Credit / Debit Card", icon: CreditCard },
                  { value: "cod", label: "Cash on Delivery", icon: Banknote }
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-3 text-sm text-brand-ink">
                    <input
                      type="radio"
                      name="payment-method"
                      value={option.value}
                      checked={method === option.value}
                      onChange={() => setMethod(option.value)}
                      className="h-4 w-4 accent-brand-green"
                    />
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-line bg-white text-brand-ink">
                      <option.icon className="h-4 w-4" />
                    </span>
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-md border border-brand-line bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">Order total</p>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-semibold text-brand-ink">{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                <span>Delivery fee</span>
                <span className="font-semibold text-brand-ink">
                  {totals.deliveryFee === 0 ? "Free" : formatPrice(totals.deliveryFee)}
                </span>
              </div>
              {totals.handlingFee && totals.handlingFee > 0 ? (
                <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                  <span>Handling charge</span>
                  <span className="font-semibold text-brand-ink">{formatPrice(totals.handlingFee)}</span>
                </div>
              ) : null}
              <div className="mt-3 flex items-center justify-between border-t border-dashed border-brand-line pt-3 text-lg font-semibold text-brand-ink">
                <span>Total</span>
                <span>{formatPrice(totals.total)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={isProcessing}
              className="inline-flex w-full items-center justify-center rounded-md bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              {isProcessing
                ? "Opening Razorpay..."
                : method === "cod"
                  ? "Continue to COD checkout"
                  : `Pay ${formatPrice(totals.total)}`}
            </button>
            <Link
              href="/category/all"
              className="inline-flex w-full items-center justify-center rounded-md border border-brand-line px-5 py-3 text-sm font-semibold text-brand-ink transition hover:border-brand-green hover:text-brand-green"
            >
              Continue shopping
            </Link>
            {paymentError ? <p className="text-xs font-semibold text-rose-600">{paymentError}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
