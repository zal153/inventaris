"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showManualHint, setShowManualHint] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const handleRegister = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("Service Worker registered with scope: ", reg.scope);
          })
          .catch((err) => {
            console.warn("Service Worker registration failed: ", err);
          });
      };

      if (document.readyState === "complete") {
        handleRegister();
      } else {
        window.addEventListener("load", handleRegister);
      }
    }

    // Listen for the browser's install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setShowInstallBanner(false);
      setShowManualHint(false);
      return;
    }

    // If on mobile and no install prompt fired after 3 seconds, show manual hint
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const timer = setTimeout(() => {
        // Only show manual hint if no native prompt was captured
        setShowManualHint((prev) => {
          // If deferredPrompt exists (native prompt captured), don't show manual hint
          return false;
        });
        // We use a separate check via a ref-like approach
        if (!deferredPrompt) {
          setShowManualHint(true);
        }
      }, 3000);

      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Handle native install
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      console.log("PWA installed successfully");
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Dismiss banner
  const dismissBanner = () => {
    setShowInstallBanner(false);
    setShowManualHint(false);
    // Remember dismissal for this session
    sessionStorage.setItem("pwa-banner-dismissed", "true");
  };

  // Check if dismissed this session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
      if (dismissed === "true") {
        setShowInstallBanner(false);
        setShowManualHint(false);
      }
    }
  }, []);

  // Show native install banner
  if (showInstallBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-slide-up">
        <div className="bg-primary text-primary-foreground rounded-2xl shadow-2xl p-4 flex items-center gap-3 border border-primary/20">
          <div className="flex-shrink-0 bg-white/20 rounded-xl p-2.5">
            <Download className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Instal StockSync</p>
            <p className="text-xs opacity-90 mt-0.5">
              Pasang aplikasi di layar utama HP Anda
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="flex-shrink-0 bg-white text-primary font-bold px-4 py-2 rounded-xl text-xs shadow-sm hover:bg-white/90 transition"
          >
            Instal
          </button>
          <button
            onClick={dismissBanner}
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/20 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // Show manual install hint (for HTTP / unsupported browsers)
  if (showManualHint) {
    const isIOS = /iPhone|iPad|iPod/i.test(
      typeof navigator !== "undefined" ? navigator.userAgent : ""
    );

    return (
      <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-slide-up">
        <div className="bg-card text-foreground rounded-2xl shadow-2xl p-4 border border-border">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2.5">
              <Download className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Instal StockSync di HP Anda</p>
              {isIOS ? (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Ketuk tombol{" "}
                  <span className="font-bold text-foreground">Share</span>{" "}
                  (ikon kotak dengan panah ke atas) di bawah layar Safari, lalu pilih{" "}
                  <span className="font-bold text-foreground">
                    &quot;Add to Home Screen&quot;
                  </span>
                  .
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Ketuk tombol{" "}
                  <span className="font-bold text-foreground">⋮ (Titik Tiga)</span>{" "}
                  di pojok kanan atas Chrome, lalu pilih{" "}
                  <span className="font-bold text-foreground">
                    &quot;Tambahkan ke Layar Utama&quot;
                  </span>{" "}
                  atau{" "}
                  <span className="font-bold text-foreground">
                    &quot;Install app&quot;
                  </span>
                  .
                </p>
              )}
            </div>
            <button
              onClick={dismissBanner}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted transition"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
