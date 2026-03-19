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
        const maybePromise: any = router.prefetch(route);
        if (maybePromise && typeof maybePromise.then === "function") {
          (maybePromise as Promise<unknown>).catch(() => {
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
