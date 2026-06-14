"use client";

import Link from "next/link";
import { Plus, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3 animate-fade-in stagger-3" style={{ opacity: 0 }}>
      <Link
        href="/products/new"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 active:scale-[0.97]"
      >
        <Plus className="h-4 w-4" />
        Tambah Barang
      </Link>
      <Link
        href="/stock-in/new"
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-600/30 active:scale-[0.97]"
      >
        <ArrowDownToLine className="h-4 w-4" />
        Catat Masuk
      </Link>
      <Link
        href="/stock-out/new"
        className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-600/20 transition-all hover:bg-orange-700 hover:shadow-md hover:shadow-orange-600/30 active:scale-[0.97]"
      >
        <ArrowUpFromLine className="h-4 w-4" />
        Catat Keluar
      </Link>
    </div>
  );
}
