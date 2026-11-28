"use client";

import { useEffect, useState } from "react";

export default function InstallAppTrigger() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const check = () => {
      const nav = window.navigator as Navigator & { standalone?: boolean };
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
      if (standalone) {
        setAvailable(false);
        return;
      }
      const ua = window.navigator.userAgent;
      const isIos =
        /iPad|iPhone|iPod/.test(ua) ||
        (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
      const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
      setAvailable(Boolean(window.__brInstallPrompt) || (isIos && isSafari));
    };
    check();
    window.addEventListener("br-pwa-state", check);
    return () => window.removeEventListener("br-pwa-state", check);
  }, []);

  if (!available) return null;

  return (
    <button
      type="button"
      className="foot-install-btn"
      onClick={() => window.__brOpenInstallHelp?.()}
    >
      Install app ↓
    </button>
  );
}
