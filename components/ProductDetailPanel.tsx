 "use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { QuantityButton } from "@/components/QuantityButton";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { GroceryProduct } from "@/types/product";

interface ProductDetailPanelProps {
  product: GroceryProduct;
}

export function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  const { addToCart, getItemQuantity, openCart } = useCart();
  const sizeOptions = product.packSizes?.length ? product.packSizes : [product.weight];
  const [selectedWeight, setSelectedWeight] = useState(sizeOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const inCart = getItemQuantity(product.id, selectedWeight);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const [lens, setLens] = useState({
    visible: false,
    x: 0,
    y: 0,
    bgX: 50,
    bgY: 50
  });

  const handleAddToCart = () => {
    addToCart(product, selectedWeight, quantity);
    openCart();
  };

  const handleLensMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const node = imageRef.current;

    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;

    const x = Math.min(Math.max(offsetX, 0), rect.width);
    const y = Math.min(Math.max(offsetY, 0), rect.height);

    const bgX = (x / rect.width) * 100;
    const bgY = (y / rect.height) * 100;

    setLens({
      visible: true,
      x,
      y,
      bgX,
      bgY
    });
  };

  const handleLensLeave = () => {
    setLens((current) => ({ ...current, visible: false }));
  };

  return (
    <section className="site-container page-section">
      <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr]">
        <div className="surface-panel overflow-hidden p-4 sm:p-6">
          <div
            ref={imageRef}
            onMouseMove={handleLensMove}
            onMouseLeave={handleLensLeave}
            className="relative aspect-square overflow-hidden rounded-2xl border border-brand-line bg-white"
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
            {lens.visible ? (
              <div
                className="pointer-events-none absolute h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/80 shadow-lg"
                style={{
                  left: lens.x,
                  top: lens.y,
                  backgroundImage: `url(${product.image})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "340% 340%",
                  backgroundPosition: `${lens.bgX}% ${lens.bgY}%`
                }}
              />
            ) : null}
          </div>
        </div>

        <div className="surface-panel p-5 sm:p-7">
          <div className="space-y-6">
            <div className="space-y-2">
              {product.brand && product.brand.toLowerCase() !== "quickbasket" ? (
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{product.brand}</p>
              ) : null}
              <h1 className="text-2xl font-semibold leading-tight text-brand-ink sm:text-3xl">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-brand-line px-3 py-1 font-semibold text-slate-600">
                  {product.category}
                </span>
                <span className="rounded-full border border-brand-line px-3 py-1 font-semibold text-slate-600">
                  {selectedWeight}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <p className="text-2xl font-bold text-brand-ink">{formatPrice(product.price)}</p>
              <span className="text-sm text-slate-500">10-15 min delivery</span>
            </div>

            <div className="space-y-3 border-t border-brand-line/60 pt-5">
              <p className="text-sm font-semibold text-slate-600">Pack size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((weight) => (
                  <button
                    key={weight}
                    type="button"
                    onClick={() => setSelectedWeight(weight)}
                    className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                      selectedWeight === weight
                        ? "border-brand-green bg-brand-green text-white"
                        : "border-brand-line bg-white text-slate-600"
                    }`}
                  >
                    {weight}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-brand-line/60 pt-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-slate-600">Quantity</p>
                <div className="mt-2">
                  <QuantityButton
                    value={quantity}
                    onIncrease={() => setQuantity((currentValue) => Math.min(currentValue + 1, product.stock))}
                    onDecrease={() => setQuantity((currentValue) => Math.max(currentValue - 1, 1))}
                  />
                </div>
              </div>

              <div className="flex-1 sm:min-w-[220px] sm:self-end">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-brand-green px-6 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Add to cart
                </button>
                {inCart > 0 ? <p className="mt-2 text-xs text-slate-500">{`${inCart} already in cart`}</p> : null}
              </div>
            </div>

            <div className="rounded-xl border border-brand-line/60 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Product description</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
