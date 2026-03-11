"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const COLOR = "#f5c400";
const HEIGHT_PX = 3;

export function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setVisible(true);
    setProgress(20);

    const timeoutId = window.setTimeout(() => {
      setProgress(60);
    }, 120);

    const timeoutId2 = window.setTimeout(() => {
      setProgress(85);
    }, 320);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setProgress(100);
      window.setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 220);
    }, 520);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearTimeout(timeoutId2);
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [pathname, searchParams]);

  return (
    <div
      className="pointer-events-none absolute left-0 bottom-0 z-[60] w-full"
      style={{
        height: `${HEIGHT_PX}px`,
        opacity: visible ? 1 : 0,
        transition: "opacity 180ms ease"
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          backgroundColor: COLOR,
          boxShadow: "0 0 8px rgba(245, 196, 0, 0.7)",
          transition: "width 240ms ease"
        }}
      />
    </div>
  );
}
