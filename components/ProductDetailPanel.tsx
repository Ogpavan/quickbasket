 "use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { MouseEvent } from "react";
import { useRef, useState } from "react";

import { QuantityButton } from "@/components/QuantityButton";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/utils";
import { GroceryProduct } from "@/types/product";

interface ProductDetailPanelProps {
  product: GroceryProduct;
}

export function ProductDetailPanel({ product }: ProductDetailPanelProps) {
  const router = useRouter();
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

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height, 28);

    addToCart(product, selectedWeight, quantity, {
      image: product.image,
      from: {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        size
      }
    });
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
        <div className="overflow-hidden rounded-md border border-brand-line bg-white p-4 sm:p-6 shadow-card">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-white text-brand-ink transition hover:border-brand-yellow"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div
            ref={imageRef}
            onMouseMove={handleLensMove}
            onMouseLeave={handleLensLeave}
            className="relative aspect-square overflow-hidden rounded-md border border-brand-line bg-white"
          >
            <Image
              src={product.image}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className={product.stock === 0 ? "object-cover grayscale" : "object-cover"}
            />
            {lens.visible ? (
              <div
                className="pointer-events-none absolute h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-md border border-brand-line bg-white/80"
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

        <div className="rounded-md border border-brand-line bg-white p-5 sm:p-7 shadow-card">
          <div className="space-y-6">
            <div className="space-y-2">
              {product.brand && product.brand.toLowerCase() !== "quickbasket" ? (
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-muted">{product.brand}</p>
              ) : null}
              <h1 className="text-2xl font-semibold leading-tight text-brand-ink sm:text-3xl">{product.name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                <span className="rounded-md border border-brand-line px-3 py-1 font-semibold text-brand-muted">
                  {product.category}
                </span>
                <span className="rounded-md border border-brand-line px-3 py-1 font-semibold text-brand-muted">
                  {selectedWeight}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <p className="text-2xl font-bold text-brand-ink">{formatPrice(product.price)}</p>
              <span className="text-sm text-brand-muted">10-15 min delivery</span>
            </div>

            <div className="space-y-3 border-t border-brand-line/60 pt-5">
              <p className="text-sm font-semibold text-brand-muted">Pack size</p>
              <div className="flex flex-wrap gap-2">
                {sizeOptions.map((weight) => (
                  <button
                    key={weight}
                    type="button"
                    onClick={() => setSelectedWeight(weight)}
                    className={`rounded-md border px-4 py-2 text-sm font-semibold transition ${
                      selectedWeight === weight
                        ? "border-brand-yellow bg-brand-yellow text-brand-ink"
                        : "border-brand-line bg-white text-brand-muted"
                    }`}
                  >
                    {weight}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-brand-line/60 pt-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold text-brand-muted">Quantity</p>
                <div className="mt-2">
                  <QuantityButton
                    value={quantity}
                    onIncrease={() => setQuantity((currentValue) => Math.min(currentValue + 1, product.stock))}
                    onDecrease={() => setQuantity((currentValue) => Math.max(currentValue - 1, 1))}
                    className="rounded-md shadow-none [&>button]:rounded-md"
                  />
                </div>
              </div>

              <div className="flex-1 sm:min-w-[220px] sm:self-end">
                <div className="mb-2 min-h-4" aria-live="polite">
                  <p className="text-xs text-brand-muted">{inCart > 0 ? `${inCart} already in cart` : ""}</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="inline-flex h-12 w-full items-center justify-center rounded-md bg-brand-yellow px-6 text-sm font-semibold text-brand-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Add to cart
                </button>
              </div>
            </div>

            <div className="rounded-md border border-brand-line bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-muted">Product description</p>
              <p className="mt-3 text-sm leading-7 text-brand-muted">{product.description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
