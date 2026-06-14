"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X, Smartphone, Share2, MoreVertical, PlusSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Store the deferred prompt globally so it persists across re-renders
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

interface PWAInstallButtonProps {
  collapsed?: boolean;
}

export function PWAInstallButton({ collapsed = false }: PWAInstallButtonProps) {
  const [canInstall, setCanInstall] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));

    // Check if we already have a deferred prompt from earlier
    if (globalDeferredPrompt) {
      setCanInstall(true);
    }

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    const installHandler = () => {
      setIsInstalled(true);
      setCanInstall(false);
      globalDeferredPrompt = null;
    };
    window.addEventListener("appinstalled", installHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installHandler);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    // If native prompt is available, use it
    if (globalDeferredPrompt) {
      try {
        await globalDeferredPrompt.prompt();
        const result = await globalDeferredPrompt.userChoice;
        if (result.outcome === "accepted") {
          setIsInstalled(true);
          setCanInstall(false);
        }
        globalDeferredPrompt = null;
      } catch (err) {
        console.warn("Install prompt error:", err);
        // If native prompt fails, show manual modal
        setShowModal(true);
      }
    } else {
      // Show manual installation instructions modal
      setShowModal(true);
    }
  }, []);

  // Don't show if already installed
  if (isInstalled) return null;

  return (
    <>
      {/* Install Button in Sidebar */}
      <button
        onClick={handleInstallClick}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
          "bg-gradient-to-r from-primary/10 to-primary/5 text-primary hover:from-primary/20 hover:to-primary/10 border border-primary/20 hover:border-primary/30",
          collapsed && "justify-center px-2"
        )}
        title={collapsed ? "Download Aplikasi" : undefined}
      >
        <Download className="h-[18px] w-[18px] shrink-0 animate-bounce" />
        {!collapsed && (
          <span className="truncate">Download Aplikasi</span>
        )}
      </button>

      {/* Installation Instructions Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 rounded-xl p-2.5">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Instal StockSync</h3>
                    <p className="text-sm opacity-90">Pasang di layar utama HP</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl hover:bg-white/20 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Steps */}
            <div className="p-5 space-y-4">
              {isIOS ? (
                <>
                  {/* iOS Instructions */}
                  <p className="text-sm text-muted-foreground font-medium">
                    Ikuti langkah berikut di <strong>Safari</strong>:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border">
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Ketuk tombol Share</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          Ikon <Share2 className="h-3.5 w-3.5 inline" /> di bagian bawah Safari
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border">
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Scroll ke bawah & pilih</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <PlusSquare className="h-3.5 w-3.5 inline" /> &quot;Add to Home Screen&quot;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border">
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Ketuk &quot;Add&quot;</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ikon StockSync akan muncul di layar utama
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Android Chrome Instructions */}
                  <p className="text-sm text-muted-foreground font-medium">
                    Ikuti langkah berikut di <strong>Chrome</strong>:
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border">
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Ketuk tombol ⋮ (titik tiga)</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MoreVertical className="h-3.5 w-3.5 inline" /> di pojok kanan atas Chrome
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border">
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Pilih &quot;Install app&quot;</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          atau &quot;Tambahkan ke Layar Utama&quot;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-accent/50 border border-border">
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Ketuk &quot;Install&quot;</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ikon StockSync akan muncul di layar utama HP Anda
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Extra tip */}
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      💡 <strong>Tips:</strong> Jika tidak muncul opsi &quot;Install app&quot;, coba buka halaman ini di <strong>Chrome</strong> (bukan browser bawaan HP), atau muat ulang halaman terlebih dahulu.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition shadow-lg"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
