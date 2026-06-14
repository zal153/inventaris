"use client";

import { Menu, Bell, Search, X, Package, AlertTriangle, AlertCircle, SearchCheck } from "lucide-react";
import { cn, getStockStatus } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getProducts } from "@/actions/product.actions";
import type { ProductWithRelations } from "@/types";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Master Barang",
  "/products/new": "Tambah Barang",
  "/categories": "Kategori Barang",
  "/stock-in": "Barang Masuk",
  "/stock-in/new": "Catat Barang Masuk",
  "/stock-out": "Barang Keluar",
  "/stock-out/new": "Catat Barang Keluar",
  "/history": "Riwayat Transaksi",
  "/reports": "Laporan",
  "/settings/database": "Backup Database",
  "/settings/activity": "Log Aktivitas",
};

interface HeaderProps {
  collapsed: boolean;
  onMobileOpen: () => void;
  userName?: string;
  lowStockCount?: number;
}

export function Header({ collapsed, onMobileOpen, userName = "Admin", lowStockCount = 0 }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Search & notification states
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  // Refs for closing popups
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch products client-side for quick search
  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await getProducts();
        setProducts(data);
      } catch (err) {
        console.warn("Could not load products in header:", err);
      }
    }
    loadProducts();
  }, [pathname]); // Reload when path changes (means data might have updated)

  // Handle outside clicks to close notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Escape key handler to close search modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSearch(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getTitle = () => {
    if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
    if (pathname.startsWith("/products/") && pathname !== "/products/new") return "Detail Barang";
    return "StockSync Offline";
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href: string }[] = [];

    let path = "";
    for (const segment of segments) {
      path += `/${segment}`;
      const title = ROUTE_TITLES[path];
      if (title) {
        crumbs.push({ label: title, href: path });
      }
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Filter products for search
  const filteredProducts = searchQuery.trim()
    ? products.filter(
        (p) =>
          p.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Low stock products logic for notification dropdown
  const lowStockItems = products.filter((p) => p.stok <= p.minimumStok);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 lg:px-6 transition-all duration-300">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMobileOpen}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-col">
            <h1 className="text-lg font-semibold text-foreground leading-tight">{getTitle()}</h1>
            {breadcrumbs.length > 1 && (
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.href} className="flex items-center gap-1.5">
                    {i > 0 && <span className="text-border">/</span>}
                    <span
                      className={cn(
                        i === breadcrumbs.length - 1
                          ? "text-foreground font-medium"
                          : "hover:text-foreground cursor-pointer"
                      )}
                      onClick={() => i !== breadcrumbs.length - 1 && router.push(crumb.href)}
                    >
                      {crumb.label}
                    </span>
                  </span>
                ))}
              </nav>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search trigger button */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Pencarian Cepat"
          >
            <Search className="h-4.5 w-4.5" />
          </button>

          {/* Notifications Trigger & Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
                showNotifications && "bg-accent text-foreground"
              )}
              title="Notifikasi Stok"
            >
              <Bell className="h-4.5 w-4.5" />
              {lowStockCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse-soft">
                  {lowStockCount > 9 ? "9+" : lowStockCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-border bg-card p-4 shadow-lg ring-1 ring-black/5 focus:outline-none z-50 animate-scale-in">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Peringatan Stok Menipis
                  </h4>
                  <span className="text-[10px] bg-warning/10 text-warning px-2 py-0.5 rounded-full font-bold">
                    {lowStockItems.length} Barang
                  </span>
                </div>

                <div className="mt-2 space-y-1.5 max-h-60 overflow-y-auto">
                  {lowStockItems.length > 0 ? (
                    lowStockItems.slice(0, 5).map((item) => {
                      const isOut = item.stok === 0;
                      return (
                        <Link
                          key={item.id}
                          href={`/products/${item.id}`}
                          onClick={() => setShowNotifications(false)}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 border border-transparent hover:border-border transition"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {item.namaBarang}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {item.kodeBarang}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "text-xs font-bold px-1.5 py-0.5 rounded",
                              isOut ? "text-destructive bg-destructive/10" : "text-warning bg-warning/10"
                            )}
                          >
                            {isOut ? "Habis" : `${item.stok} ${item.satuan}`}
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      Semua persediaan stok dalam keadaan aman!
                    </div>
                  )}
                </div>

                {lowStockItems.length > 0 && (
                  <Link
                    href="/reports"
                    onClick={() => setShowNotifications(false)}
                    className="mt-3 block text-center text-[11px] font-semibold text-primary hover:underline border-t border-border/60 pt-2"
                  >
                    Lihat Selengkapnya di Laporan
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* User avatar info */}
          <div className="flex items-center gap-2 ml-1 pl-3 border-l border-border">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-foreground leading-tight">{userName}</span>
              <span className="text-[11px] text-muted-foreground leading-tight">Administrator</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Search Overlay Modal ───────────────────────── */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[15vh]">
          {/* Backdrop blur */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowSearch(false)}
          />

          {/* Search Box Panel */}
          <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-lg animate-scale-in z-10">
            <div className="flex items-center px-4 py-3 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground mr-3" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari nama barang atau kode barang..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none border-0 py-1"
              />
              <button
                onClick={() => setShowSearch(false)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Results */}
            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery.trim() ? (
                filteredProducts.length > 0 ? (
                  <div className="space-y-1">
                    {filteredProducts.map((p) => {
                      const status = getStockStatus(p.stok, p.minimumStok);
                      return (
                        <Link
                          key={p.id}
                          href={`/products/${p.id}`}
                          onClick={() => {
                            setShowSearch(false);
                            setSearchQuery("");
                          }}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/80 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg border border-border bg-muted/10 flex items-center justify-center text-muted-foreground">
                              {p.gambar ? (
                                <img src={p.gambar} alt="Barang" className="h-full w-full object-cover rounded-lg" />
                              ) : (
                                <Package className="h-4.5 w-4.5" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                {p.namaBarang}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {p.kodeBarang}
                              </p>
                            </div>
                          </div>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                              status.color === "danger"
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : status.color === "warning"
                                ? "bg-warning/10 text-warning border-warning/20"
                                : "bg-success/10 text-success border-success/20"
                            )}
                          >
                            {p.stok} {p.satuan}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Barang tidak ditemukan. Coba masukkan nama/kode lain.
                  </div>
                )
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <SearchCheck className="h-8 w-8 text-muted-foreground/40" />
                  <span>Ketikkan sesuatu untuk mencari barang secara instan...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
