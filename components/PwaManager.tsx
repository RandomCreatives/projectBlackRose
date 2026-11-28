"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

declare global {
  interface Window {
    __brInstallPrompt?: BeforeInstallPromptEvent | null;
    __brOpenInstallHelp?: () => void;
  }
}

const DISMISS_KEY = "br_pwa_dismissed_until";
const DISMISS_DAYS = 14;

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

export default function PwaManager() {
  const pathname = usePathname() || "/";
  const isAdmin = pathname.startsWith("/admin");

  const [standalone, setStandalone] = useState(true);
  const [canInstall, setCanInstall] = useState(false);
  const [iosGuideEligible, setIosGuideEligible] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    try {
      const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
      window.localStorage.setItem(DISMISS_KEY, String(until));
    } catch {
      /* private mode */
    }
  }, []);

  const triggerInstall = useCallback(async () => {
    const evt = window.__brInstallPrompt;
    if (evt) {
      await evt.prompt();
      const choice = await evt.userChoice.catch(() => ({ outcome: "dismissed" as const }));
      window.__brInstallPrompt = null;
      setCanInstall(false);
      setShowBanner(false);
      if (choice.outcome === "dismissed") {
        dismissBanner();
      }
      window.dispatchEvent(new Event("br-pwa-state"));
      return;
    }
    if (iosGuideEligible) {
      setShowBanner(false);
      setShowIosModal(true);
    }
  }, [dismissBanner, iosGuideEligible]);

  useEffect(() => {
    // 1. Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* non-blocking */
      });
    }

    // 2. Online / offline awareness
    const syncOnline = () => setIsOffline(!navigator.onLine);
    syncOnline();
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);

    // 3. Standalone + install prompt detection
    const installed = isStandaloneMode();
    setStandalone(installed);

    let suppressed = false;
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (raw && Number(raw) > Date.now()) suppressed = true;
    } catch {
      /* ignore */
    }

    const ios = !installed && isIosSafari();
    setIosGuideEligible(ios);

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (ios && !suppressed) {
      timer = setTimeout(() => setShowBanner(true), 4000);
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      window.__brInstallPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
      window.dispatchEvent(new Event("br-pwa-state"));
      if (!installed && !suppressed) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setShowBanner(true), 3200);
      }
    };

    const onAppInstalled = () => {
      window.__brInstallPrompt = null;
      setStandalone(true);
      setCanInstall(false);
      setShowBanner(false);
      setShowIosModal(false);
      window.dispatchEvent(new Event("br-pwa-state"));
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    window.__brOpenInstallHelp = () => {
      void triggerInstall();
    };
    window.dispatchEvent(new Event("br-pwa-state"));
    return () => {
      window.__brOpenInstallHelp = undefined;
    };
  }, [triggerInstall]);

  useEffect(() => {
    if (!showIosModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowIosModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showIosModal]);

  const shouldShowBanner =
    !isAdmin && !standalone && showBanner && (canInstall || iosGuideEligible);

  return (
    <>
      {isOffline && !isAdmin ? (
        <div className="pwa-offline" role="status" aria-live="polite">
          <span className="pwa-offline-dot" aria-hidden="true" />
          Offline mode — showing saved pages
        </div>
      ) : null}

      {shouldShowBanner ? (
        <aside className="pwa-toast" aria-label="Install Black Rose app">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/favicon/favicon-192.png"
            alt=""
            width={44}
            height={44}
            className="pwa-toast-icon"
          />
          <div className="pwa-toast-copy">
            <b>Black Rose Lounge</b>
            <span>Add to your home screen for quick menu &amp; offline access.</span>
          </div>
          <div className="pwa-toast-acts">
            <button type="button" className="pwa-toast-go" onClick={triggerInstall}>
              {canInstall ? "Install" : "How to add"}
            </button>
            <button
              type="button"
              className="pwa-toast-close"
              onClick={dismissBanner}
              aria-label="Dismiss install prompt"
            >
              ✕
            </button>
          </div>
        </aside>
      ) : null}

      {showIosModal ? (
        <div
          className="pwa-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-ios-title"
          onClick={() => setShowIosModal(false)}
        >
          <div className="pwa-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="pwa-modal-x"
              onClick={() => setShowIosModal(false)}
              aria-label="Close instructions"
            >
              ✕
            </button>
            <div className="pwa-modal-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/favicon/favicon-192.png"
                alt="Black Rose Lounge app icon"
                width={56}
                height={56}
                className="pwa-toast-icon"
              />
              <div>
                <p className="eyebrow" style={{ marginBottom: 4 }}>
                  Add to Home Screen
                </p>
                <h2 id="pwa-ios-title" style={{ fontSize: 22, margin: 0 }}>
                  Install Black Rose
                </h2>
              </div>
            </div>
            <ol className="pwa-ios-steps">
              <li>
                Tap the <b>Share</b> button <span className="pwa-share-ico" aria-hidden="true">⎋</span> at the bottom
                of Safari.
              </li>
              <li>
                Scroll down and tap <b>Add to Home Screen</b>.
              </li>
              <li>
                Tap <b>Add</b> — the Black Rose icon will appear right on your home screen.
              </li>
            </ol>
            <button
              type="button"
              className="btn solid"
              style={{ width: "100%", marginTop: 18 }}
              onClick={() => setShowIosModal(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
