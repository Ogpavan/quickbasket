"use client";

import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface QuantityButtonProps {
  value: number;
  onIncrease: () => void;
  onDecrease: () => void;
  disabled?: boolean;
  compact?: boolean;
  animate?: boolean;
  className?: string;
}

export function QuantityButton({
  value,
  onIncrease,
  onDecrease,
  disabled = false,
  compact = false,
  animate = false,
  className
}: QuantityButtonProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-brand-line bg-brand-cream p-1 text-brand-ink shadow-card transition",
        compact ? "gap-0.5" : "gap-1",
        animate ? "animate-cart-bump" : "",
        className
      )}
    >
      <button
        type="button"
        onClick={onDecrease}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-white text-brand-ink transition hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-50",
          compact ? "h-7 w-7" : "h-9 w-9"
        )}
        aria-label="Decrease quantity"
      >
        <Minus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
      <span className={cn("min-w-6 text-center font-semibold", compact ? "text-xs" : "text-sm")}>{value}</span>
      <button
        type="button"
        onClick={onIncrease}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-brand-yellow text-brand-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50",
          compact ? "h-7 w-7" : "h-9 w-9"
        )}
        aria-label="Increase quantity"
      >
        <Plus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>
    </div>
  );
}
