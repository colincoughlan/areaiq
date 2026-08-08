"use client";

import { useEffect } from "react";

/** Registers the service worker (production only — caching during dev is confusing). */
export function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* PWA is progressive enhancement — app works fully without it */
      });
    }
  }, []);
  return null;
}
