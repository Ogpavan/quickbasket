"use client";

import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { QuantityButton } from "@/components/QuantityButton";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { CartLineItem } from "@/types/product";

interface CartItemProps {
  item: CartLineItem;
  compact?: boolean;
}

export function CartItem({ item, compact = false }: CartItemProps) {
  const { removeFromCart, updateQuantity } = useCart();

  return (
    <div className={`rounded-xl border border-brand-line/80 bg-white p-3 shadow-sm ${compact ? "" : "sm:p-5"}`}>
      <div className={`flex ${compact ? "items-center gap-3" : "flex-col gap-4 sm:flex-row sm:items-center"}`}>
        <Link
          href={`/product/${item.slug}`}
          className={`relative block overflow-hidden rounded-lg bg-brand-mint ${compact ? "h-20 w-20" : "aspect-square w-full sm:h-28 sm:w-28"}`}
        >
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes={compact ? "80px" : "112px"}
            className="object-cover transition duration-500 hover:scale-105"
          />
        </Link>

        <div className={`flex-1 ${compact ? "" : "sm:ml-2"}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{item.brand}</p>
              <Link href={`/product/${item.slug}`} className="mt-1 block text-sm font-medium text-brand-ink">
                {item.name}
              </Link>
              <p className="mt-1 text-xs text-slate-500">{item.weight}</p>
            </div>
            <p className="text-sm font-semibold text-brand-ink">{formatPrice(item.price)}</p>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <QuantityButton
              compact={compact}
              value={item.quantity}
              onIncrease={() => updateQuantity(item.lineId, item.quantity + 1)}
              onDecrease={() => updateQuantity(item.lineId, item.quantity - 1)}
            />
            <button
              type="button"
              onClick={() => removeFromCart(item.lineId)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-red-500"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
