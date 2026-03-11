"use client";

import { FormEvent, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

interface SearchBarProps {
  initialValue?: string;
  placeholder?: string;
  basePath?: string;
  compact?: boolean;
  inputId?: string;
  className?: string;
}

export function SearchBar({
  initialValue = "",
  placeholder = "Search for milk, fruits, bread...",
  basePath = "/category/all",
  compact = false,
  inputId,
  className
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      router.push(`${basePath}?search=${encodeURIComponent(normalizedQuery)}`);
      return;
    }

    router.push(basePath);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-brand-line bg-white px-4 shadow-card transition focus-within:border-brand-yellowDeep focus-within:ring-2 focus-within:ring-brand-yellow/40",
        compact ? "h-12" : "h-14 sm:h-16",
        className
      )}
    >
      <Search className="h-5 w-5 shrink-0 text-slate-400" />
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="h-full flex-1 bg-transparent text-sm text-brand-ink placeholder:text-slate-400"
      />
      <button
        type="submit"
        className={cn(
          "rounded-lg bg-brand-yellow px-4 text-sm font-semibold text-brand-ink transition hover:bg-brand-yellowDeep",
          compact ? "hidden sm:inline-flex sm:h-9 sm:items-center" : "inline-flex h-10 items-center"
        )}
      >
        Search
      </button>
    </form>
  );
}
