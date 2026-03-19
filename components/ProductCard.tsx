"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";
import { memo, useEffect, useRef, useState } from "react";

import { useCart } from "@/context/CartContext";
import { cn, formatPrice } from "@/lib/utils";
import { GroceryProduct } from "@/types/product";

interface ProductCardProps {
  product: GroceryProduct;
  className?: string;
}

function ProductCardBase({ product, className }: ProductCardProps) {
  const { addToCart, getItemQuantity, setItemQuantity } = useCart();
  const quantity = getItemQuantity(product.id, product.weight);
  const previousQuantity = useRef(quantity);
  const [animateControls, setAnimateControls] = useState(false);
  const badgeLabel = product.featured
    ? "Popular"
    : product.frequentlyBought
      ? "Best seller"
      : "";

  useEffect(() => {
    if (quantity > previousQuantity.current) {
      setAnimateControls(true);
      const timeoutId = window.setTimeout(() => setAnimateControls(false), 180);
      previousQuantity.current = quantity;

      return () => window.clearTimeout(timeoutId);
    }

    previousQuantity.current = quantity;
  }, [quantity]);

  const buildFlyPayload = (event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height, 24);

    return {
      image: product.image,
      from: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        size
      }
    };
  };

  return (
    <article
      className={cn(
        "group flex h-full min-h-[220px] flex-col overflow-hidden rounded-sm border border-brand-line bg-white p-2.5 shadow-card transition duration-150 hover:-translate-y-0.5 hover:shadow-float sm:min-h-[248px] sm:p-3",
        className
      )}
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden rounded-sm bg-transparent">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 20vw, 180px"
            className={cn(
              "object-cover transition duration-300 group-hover:scale-[1.03]",
              product.stock === 0 ? "grayscale" : ""
            )}
            loading="lazy"
          />
          {badgeLabel ? (
            <span className="absolute left-2 top-2 rounded-full bg-brand-yellow px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-ink">
              {badgeLabel}
            </span>
          ) : null}
        </div>
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        <Link href={`/product/${product.slug}`} className="block">
          <h3 className="line-clamp-2 text-[13px] font-medium leading-5 text-brand-ink">{product.name}</h3>
        </Link>

        <p className="mt-1 text-xs text-brand-muted">{product.weight}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <p className="text-[15px] font-semibold text-brand-ink">{formatPrice(product.price)}</p>

          {product.stock === 0 ? (
            <span className="inline-flex h-9 items-center rounded-md border border-brand-line px-3 text-xs font-semibold text-brand-muted">
              Sold out
            </span>
          ) : quantity > 0 ? (
            <div
              className={cn(
                "inline-flex h-8 items-center rounded-md border border-brand-yellow bg-white p-0.5 text-brand-ink transition duration-150",
                animateControls ? "animate-cart-bump" : ""
              )}
            >
              <button
                type="button"
                onClick={() => setItemQuantity(product, product.weight, quantity - 1)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-base font-semibold transition duration-150 active:scale-95"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="min-w-7 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={(event) => addToCart(product, product.weight, 1, buildFlyPayload(event))}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-yellow text-base font-semibold text-brand-ink transition duration-150 hover:brightness-95 active:scale-95"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(event) => addToCart(product, product.weight, 1, buildFlyPayload(event))}
              className="inline-flex h-8 min-w-[68px] items-center justify-center rounded-md bg-brand-yellow px-2.5 text-sm font-semibold text-brand-ink transition duration-150 hover:brightness-95 active:scale-95"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

const MemoizedProductCard = memo(ProductCardBase);
MemoizedProductCard.displayName = "ProductCard";

export { MemoizedProductCard as ProductCard };
