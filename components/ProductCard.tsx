"use client";

import Image from "next/image";
import Link from "next/link";
import { Dot } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { QuantityButton } from "@/components/QuantityButton";
import { useCart } from "@/context/CartContext";
import { cn, formatPrice } from "@/lib/utils";
import { GroceryProduct } from "@/types/product";

interface ProductCardProps {
  product: GroceryProduct;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const { addToCart, getItemQuantity, setItemQuantity } = useCart();
  const quantity = getItemQuantity(product.id, product.weight);
  const previousQuantity = useRef(quantity);
  const [animateControls, setAnimateControls] = useState(false);

  useEffect(() => {
    if (quantity > previousQuantity.current) {
      setAnimateControls(true);
      const timeoutId = window.setTimeout(() => {
        setAnimateControls(false);
      }, 280);

      previousQuantity.current = quantity;

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    previousQuantity.current = quantity;
  }, [quantity]);

  return (
    <article
      className={cn(
        "surface-panel group flex h-full flex-col overflow-hidden p-2 transition duration-300 hover:-translate-y-1 hover:shadow-float",
        className
      )}
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative overflow-hidden rounded-lg bg-white">
          <div className="relative aspect-square">
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              className="object-cover transition duration-500 group-hover:scale-105"
            />
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col justify-between gap-3 px-1 pt-2">
        <div className="space-y-2">
          <div className="flex items-center text-xs font-medium text-slate-500">
            {product.brand && product.brand.toLowerCase() !== "quickbasket" ? (
              <>
                <span>{product.brand}</span>
                <Dot className="h-4 w-4 text-slate-300" />
              </>
            ) : null}
            <span>{product.category}</span>
          </div>
          <Link href={`/product/${product.slug}`} className="block">
            <h3 className="line-clamp-2 min-h-[2.25rem] text-sm font-medium leading-5 text-brand-ink transition group-hover:text-brand-green">
              {product.name}
            </h3>
          </Link>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-brand-ink">{formatPrice(product.price)}</p>
            <p className="text-xs text-slate-500">{product.weight}</p>
          </div>

          {product.stock === 0 ? (
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400">
              Sold out
            </span>
          ) : quantity > 0 ? (
            <QuantityButton
              compact
              value={quantity}
              onIncrease={() => addToCart(product, product.weight, 1)}
              onDecrease={() => setItemQuantity(product, product.weight, quantity - 1)}
              animate={animateControls}
            />
          ) : (
            <button
              type="button"
              onClick={() => addToCart(product, product.weight, 1)}
              className={cn(
                "inline-flex items-center justify-center rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110",
                animateControls ? "animate-cart-bump" : ""
              )}
            >
              Add
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
