"use client";

import { AlertTriangle, AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { LowStockProduct } from "@/types";

interface LowStockWidgetProps {
  products: LowStockProduct[];
}

export function LowStockWidget({ products }: LowStockWidgetProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm animate-fade-in">
        <h3 className="text-base font-semibold text-card-foreground mb-3">
          ⚠️ Peringatan Stok
        </h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <p className="text-sm font-medium text-card-foreground">Semua stok aman!</p>
          <p className="text-xs text-muted-foreground mt-1">Tidak ada barang yang perlu direstok</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Peringatan Stok
        </h3>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950/50 px-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
          {products.length}
        </span>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {products.map((product) => {
          const isOutOfStock = product.stok === 0;
          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              className={cn(
                "flex items-center justify-between rounded-lg border p-3 transition-all hover:shadow-sm",
                isOutOfStock
                  ? "border-destructive/20 bg-destructive/5 dark:bg-destructive/10 hover:bg-destructive/10"
                  : "border-warning/20 bg-warning/5 dark:bg-warning/10 hover:bg-warning/10"
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    isOutOfStock
                      ? "bg-destructive/10"
                      : "bg-warning/10"
                  )}
                >
                  {isOutOfStock ? (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {product.namaBarang}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {product.kodeBarang}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <p
                  className={cn(
                    "text-sm font-bold",
                    isOutOfStock
                      ? "text-destructive"
                      : "text-warning"
                  )}
                >
                  {product.stok} {product.satuan}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  min: {product.minimumStok}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/products"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        Lihat Semua Barang
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
