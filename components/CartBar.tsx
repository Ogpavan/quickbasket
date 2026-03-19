"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useCart } from "@/context/CartContext";
import { useDeliveryPricing } from "@/hooks/useDeliveryPricing";
import { calculateCartTotals, formatPrice } from "@/lib/utils";

export function CartBar() {
  const { itemCount, subtotal, items, openCart, flyItems } = useCart();
  const { distanceKm, feeConfig } = useDeliveryPricing();
  const totals = calculateCartTotals(subtotal, { distanceKm, feeConfig });
  const previewItems = items.slice(0, 4);
  const remainingCount = Math.max(items.length - previewItems.length, 0);
  const barRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const [targetPoint, setTargetPoint] = useState<{ x: number; y: number } | null>(null);

  const updateTargetPoint = () => {
    if (targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setTargetPoint({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
      return;
    }

    if (barRef.current) {
      const rect = barRef.current.getBoundingClientRect();
      setTargetPoint({
        x: rect.right - 32,
        y: rect.top + rect.height / 2
      });
      return;
    }

    if (typeof window !== "undefined") {
      setTargetPoint({
        x: window.innerWidth - 64,
        y: window.innerHeight - 96
      });
    }
  };

  useLayoutEffect(() => {
    updateTargetPoint();
  }, [itemCount, previewItems.length]);

  useEffect(() => {
    updateTargetPoint();
    window.addEventListener("resize", updateTargetPoint);

    return () => window.removeEventListener("resize", updateTargetPoint);
  }, []);

  if (itemCount <= 0 && flyItems.length === 0) {
    return null;
  }

  return (
    <div className="cartbar-backdrop fixed inset-x-0 bottom-16 z-40 px-4 sm:px-6 lg:bottom-4 pb-4 lg:pb-0">
      {targetPoint && flyItems.length > 0 ? (
        <div className="pointer-events-none fixed inset-0 z-50">
          {flyItems.map((item) => {
            const deltaX = targetPoint.x - item.from.x;
            const deltaY = targetPoint.y - item.from.y;

            const style = {
              left: item.from.x,
              top: item.from.y,
              width: item.from.size,
              height: item.from.size,
              backgroundImage: `url(${item.image})`,
              "--fly-x": `${deltaX}px`,
              "--fly-y": `${deltaY}px`
            } as CSSProperties;

            return <span key={item.id} className="cartbar-fly" style={style} />;
          })}
        </div>
      ) : null}

      {itemCount > 0 ? (
        <div
          ref={barRef}
          className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-brand-line bg-white px-4 py-3 shadow-float sm:px-6"
        >
          <div className="flex items-center gap-3">
            {previewItems.length > 0 ? (
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {previewItems.map((item, index) => (
                    <div
                      key={item.lineId}
                      ref={index === previewItems.length - 1 ? targetRef : null}
                      className="relative"
                    >
                      <div className="relative h-9 w-9 overflow-hidden rounded-full border border-brand-line bg-white ring-2 ring-white">
                        <Image src={item.image} alt={item.name} fill sizes="36px" className="object-cover" />
                      </div>
                      {remainingCount > 0 && index === previewItems.length - 1 ? (
                        <span className="absolute -right-2 -top-1 inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-brand-ink px-1 text-[10px] font-semibold text-white shadow-sm">
                          +{remainingCount}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div>
              <p className="text-xs text-brand-muted">{itemCount} items</p>
              <p className="text-base font-semibold text-brand-ink">{formatPrice(totals.total)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCart}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-yellow px-4 text-sm font-semibold text-brand-ink transition hover:brightness-95"
          >
            View cart
          </button>
        </div>
      ) : null}
    </div>
  );
}
