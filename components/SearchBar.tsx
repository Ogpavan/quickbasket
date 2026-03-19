"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { GroceryProduct } from "@/types/product";

const MIN_SUGGESTION_QUERY = 2;
const SUGGESTION_LIMIT = 6;

interface SearchBarProps {
  initialValue?: string;
  placeholder?: string;
  basePath?: string;
  compact?: boolean;
  inputId?: string;
  className?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  disableDropdown?: boolean;
  onSuggestionsChange?: (state: {
    loading: boolean;
    suggestions: GroceryProduct[];
  }) => void;
}

export function SearchBar({
  initialValue = "",
  placeholder = "Search for milk, bread, eggs",
  basePath = "/category/all",
  compact = false,
  inputId,
  className,
  onFocus,
  onBlur,
  disableDropdown = false,
  onSuggestionsChange
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<GroceryProduct[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_SUGGESTION_QUERY) {
      setSuggestions([]);
      setLoadingSuggestions(false);
      onSuggestionsChange?.({ loading: false, suggestions: [] });
      return;
    }

    setLoadingSuggestions(true);
    onSuggestionsChange?.({ loading: true, suggestions: [] });
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}&limit=${SUGGESTION_LIMIT}`,
          { signal: controller.signal, cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Unable to fetch suggestions.");
        }

        const payload = (await response.json()) as { results?: GroceryProduct[] };
        setSuggestions(payload.results ?? []);
        onSuggestionsChange?.({ loading: false, suggestions: payload.results ?? [] });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setSuggestions([]);
        onSuggestionsChange?.({ loading: false, suggestions: [] });
      } finally {
        setLoadingSuggestions(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, onSuggestionsChange]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowSuggestions(false);

    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      router.push(`${basePath}?search=${encodeURIComponent(normalizedQuery)}`);
      return;
    }

    router.push(basePath);
  };

  const dropdownVisible = !disableDropdown && showSuggestions && (loadingSuggestions || suggestions.length > 0);

  return (
    <div className="relative w-full">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-brand-line bg-white px-4 shadow-card transition focus-within:border-brand-yellow focus-within:ring-2 focus-within:ring-brand-yellow/30",
          compact ? "h-11" : "h-11 sm:h-12",
          className
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-brand-muted" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-full flex-1 bg-transparent text-sm text-brand-ink placeholder:text-brand-muted"
        onFocus={() => {
          if (blurTimeoutRef.current) {
            window.clearTimeout(blurTimeoutRef.current);
          }
          setShowSuggestions(true);
          onFocus?.();
        }}
        onBlur={() => {
          blurTimeoutRef.current = window.setTimeout(() => setShowSuggestions(false), 160);
          onBlur?.();
        }}
      />
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>
      {dropdownVisible ? (
        <ul className="absolute left-0 right-0 z-10 mt-1 max-h-72 w-full overflow-hidden rounded-2xl border border-brand-line bg-white shadow-lg">
          {loadingSuggestions ? (
            <li className="px-4 py-3 text-sm text-slate-500">Searching for products…</li>
          ) : (
            suggestions.map((product) => (
              <li
                key={product.id}
                className="border-b border-brand-line/70 last:border-0"
                onMouseDown={(event) => event.preventDefault()}
              >
                <Link
                  href={`/product/${product.slug}`}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-brand-ink transition hover:bg-slate-50"
                  onClick={() => {
                    setQuery(product.name);
                    setShowSuggestions(false);
                  }}
                >
                  <div className="relative h-10 w-10 overflow-hidden rounded-md bg-slate-100">
                    <Image src={product.image} alt={product.name} fill sizes="40px" className="object-cover" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate font-semibold">{product.name}</p>
                    <p className="truncate text-xs text-slate-500">₹{product.price.toFixed(0)}</p>
                  </div>
                  <span className="hidden shrink-0 text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-muted sm:block">
                    {product.weight}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
