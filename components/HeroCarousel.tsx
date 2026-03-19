"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { HeroSlide } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const SLIDE_INTERVAL_MS = 5000;

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export function HeroCarousel({ slides }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const slideCount = slides.length;

  useEffect(() => {
    const track = trackRef.current;

    if (!track) {
      return;
    }

    const slideWidth = track.clientWidth;
    track.scrollTo({ left: slideWidth * activeIndex, behavior: "smooth" });
  }, [activeIndex]);

  useEffect(() => {
    if (activeIndex >= slideCount) {
      setActiveIndex(0);
    }
  }, [activeIndex, slideCount]);

  useEffect(() => {
    if (slideCount <= 1 || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [slideCount, isPaused]);

  const goToSlide = (index: number) => {
    setActiveIndex(index);
  };

  const goPrevious = () => {
    if (slideCount <= 1) {
      return;
    }

    setActiveIndex((current) => (current - 1 + slideCount) % slideCount);
  };

  const goNext = () => {
    if (slideCount <= 1) {
      return;
    }

    setActiveIndex((current) => (current + 1) % slideCount);
  };

    if (slideCount === 0) {
      return null;
    }

  return (
    <section className="site-container page-section pt-3">
      <div
        className="relative overflow-hidden rounded-md border border-brand-line bg-white shadow-card"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocus={() => setIsPaused(true)}
        onBlur={() => setIsPaused(false)}
      >
        <div
          ref={trackRef}
          className="hide-scrollbar flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {slides.map((slide, index) => (
            <article key={slide.title} className="min-w-full snap-center">
              <Link
                href={slide.href}
                className={cn(
                  "group relative block h-48 w-full overflow-hidden bg-gradient-to-br sm:h-56 lg:h-64",
                  slide.theme ?? "from-slate-50 via-white to-slate-50"
                )}
                aria-label={slide.title}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  width={1200}
                  height={600}
                  sizes="100vw"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                  priority={index === 0}
                />
              </Link>
            </article>
          ))}
        </div>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-white/90 px-3 py-2 shadow-card">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2.5 w-2.5 rounded-full transition-all duration-300",
                index === activeIndex ? "bg-brand-yellow scale-110" : "bg-brand-line"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-3 sm:flex">
          <button
            type="button"
            onClick={goPrevious}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-white text-brand-ink shadow-card transition hover:border-brand-yellow hover:text-brand-ink"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-line bg-white text-brand-ink shadow-card transition hover:border-brand-yellow hover:text-brand-ink"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
