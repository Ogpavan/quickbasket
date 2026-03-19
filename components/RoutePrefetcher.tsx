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
      try {
        const maybePromise = router.prefetch(route);
        if (typeof maybePromise?.then === "function") {
          maybePromise.catch(() => {
            // Ignore failures for prefetching.
          });
        }
      } catch {
        // Ignore prefetch failures.
      }
    });
  }, [router]);

  return null;
}
