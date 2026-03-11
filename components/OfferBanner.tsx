import Image from "next/image";
import Link from "next/link";

import type { OfferItem } from "@/lib/catalog";

interface OfferBannerProps {
  offers: OfferItem[];
}

export function OfferBanner({ offers }: OfferBannerProps) {
  if (offers.length === 0) {
    return null;
  }

  return (
    <section className="site-container page-section">
      <div className="mb-4">
        <h2 className="section-title mt-1">Deals moving fast</h2>
      </div>

      <div className="hide-scrollbar -mx-4 grid snap-x snap-mandatory auto-cols-[80%] grid-flow-col gap-3 overflow-x-auto px-4 sm:mx-0 sm:auto-cols-[45%] sm:px-0 lg:auto-cols-[32%]">
        {offers.map((offer) => (
          <Link
            key={offer.title}
            href={offer.href}
            className="group relative h-44 snap-center overflow-hidden rounded-xl border border-brand-line bg-white shadow-card sm:h-52 lg:h-56"
            aria-label={offer.title}
          >
            <Image
              src={offer.image}
              alt={offer.title}
              fill
              sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 32vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
