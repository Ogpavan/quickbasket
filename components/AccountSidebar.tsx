"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gift,
  HelpCircle,
  LogOut,
  MapPin,
  Package,
  Shield,
  Stethoscope,
  User
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Saved Addresses", href: "/profile/addresses", icon: MapPin },
  { label: "My Orders", href: "/account/orders", icon: Package },
  { label: "My Prescriptions", href: "/account/prescriptions", icon: Stethoscope },
  { label: "E-Gift Cards", href: "/account/gift-cards", icon: Gift },
  { label: "FAQ's", href: "/faq", icon: HelpCircle },
  { label: "Account privacy", href: "/account/privacy", icon: Shield },
  { label: "Logout", href: "#logout", icon: LogOut }
];

export function AccountSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const phone = user?.phone || "7302667115";

  return (
    <aside className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm">
          <User className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs text-slate-500">My Account</p>
          <p className="text-sm font-semibold text-slate-900">{phone}</p>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.label === "Logout") {
            return (
              <button
                key={item.label}
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50",
                isActive ? "bg-emerald-50 font-semibold text-emerald-700" : ""
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
