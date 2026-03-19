"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const PREFETCH_ROUTES = [
  "/",
  "/category/all",
  "/cart",
  "/account/orders",
  "/profile/addresses",
  "/delivery-areas",
  "/faq"
];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    PREFETCH_ROUTES.forEach((route) => {
      const promise = router.prefetch(route);
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => {
          // Ignore failures for prefetching.
        });
      }
    });
  }, [router]);

  return null;
}
