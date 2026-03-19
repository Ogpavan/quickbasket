"use client";

import { useEffect, useState } from "react";

import { Footer } from "@/components/Footer";

const WEBVIEW_INDICATORS = ["webview", "wv", "wv/", "quickbasketapp", "quickbasket", "qnapp"];

function isWebViewUA(ua: string | null) {
  if (!ua) return false;
  const normalized = ua.toLowerCase();
  return WEBVIEW_INDICATORS.some((indicator) => normalized.includes(indicator));
}

export function FooterGate({ serverHide }: { serverHide: boolean }) {
  const [clientHide, setClientHide] = useState(serverHide);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setClientHide(isWebViewUA(navigator.userAgent));
  }, []);

  if (clientHide) {
    return null;
  }

  return <Footer />;
}
