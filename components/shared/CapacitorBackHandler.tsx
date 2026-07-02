"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * CapacitorBackHandler
 *
 * Menangani tombol hardware back di Android:
 * - Jika ada riwayat navigasi → window.history.back()
 * - Jika tidak ada riwayat → tampilkan dialog konfirmasi keluar
 */
export function CapacitorBackHandler() {
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleExitConfirmed = useCallback(() => {
    // Keluar dari aplikasi via Capacitor
    if (typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform()) {
      import("@capacitor/app").then(({ App }) => {
        App.exitApp();
      });
    }
  }, []);

  useEffect(() => {
    // Hanya aktif di Capacitor native
    if (typeof window === "undefined" || !(window as any).Capacitor?.isNativePlatform()) {
      return;
    }

    let removeListener: (() => void) | null = null;

    import("@capacitor/app").then(({ App }) => {
      App.addListener("backButton", ({ canGoBack }) => {
        // canGoBack dari Capacitor WebView (berbeda dengan browser history)
        // Untuk SPA (Next.js), bisa gunakan window.history.length sebagai fallback
        const historyLength = window.history.length;

        if (canGoBack || historyLength > 1) {
          window.history.back();
        } else {
          setShowExitDialog(true);
        }
      }).then((listener) => {
        removeListener = () => listener.remove();
      });
    });

    return () => {
      if (removeListener) {
        removeListener();
      }
    };
  }, []);

  // ── Exit Confirmation Dialog ─────────────────────────
  if (!mounted || !showExitDialog) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setShowExitDialog(false)}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card p-6 shadow-lg animate-scale-in z-10">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Tutup Aplikasi?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Apakah Anda yakin ingin keluar dari aplikasi StockSync?
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowExitDialog(false)}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/30 transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExitConfirmed}
            className="flex items-center justify-center gap-2 rounded-lg bg-destructive hover:bg-destructive/90 px-4 py-2 text-sm font-medium text-white transition"
          >
            Keluar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
