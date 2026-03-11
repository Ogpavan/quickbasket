"use client";

import Link from "next/link";
import { House, LayoutGrid, Search, ShoppingCart, User } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/", icon: House },
  { label: "Categories", href: "/category/all", icon: LayoutGrid }
];

export function BottomNavigation() {
  const router = useRouter();
  const { itemCount, openCart } = useCart();
  const { user, openAuth } = useAuth();

  const focusSearch = () => {
    const input = document.getElementById("global-grocery-search") as HTMLInputElement | null;

    if (!input) {
      router.push("/category/all");
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      input.focus();
    }, 180);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-line/80 bg-white/95 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 px-2 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn("flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-brand-mint hover:text-brand-green")}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={focusSearch}
          className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-brand-mint hover:text-brand-green"
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </button>

        <button
          type="button"
          onClick={openCart}
          className="relative flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-brand-mint hover:text-brand-green"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Cart</span>
          <span className="absolute right-4 top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-brand-yellow px-1 text-[10px] font-bold text-brand-ink">
            {itemCount}
          </span>
        </button>

        {user ? (
          <Link
            href="/account/orders"
            className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-brand-green transition hover:bg-brand-mint"
          >
            <User className="h-4 w-4" />
            <span>Orders</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openAuth("account")}
            className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-slate-500 transition hover:bg-brand-mint hover:text-brand-green"
          >
            <User className="h-4 w-4" />
            <span>Account</span>
          </button>
        )}
      </div>
    </nav>
  );
}
