"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ChevronDown, X, Package } from "lucide-react";

interface Product {
  id: string;
  namaBarang: string;
  kodeBarang: string;
  stok: number;
  satuan: string;
  hargaBeli?: number;
}

interface ProductSearchSelectProps {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
  name: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function ProductSearchSelect({
  products,
  value,
  onChange,
  name,
  placeholder = "Cari / Pilih Barang...",
  disabled = false,
  required = false,
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected product
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === value);
  }, [products, value]);

  // Filter products based on search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.namaBarang.toLowerCase().includes(query) ||
        p.kodeBarang.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Autofocus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      // Prevent body scrolling on mobile when modal is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setSearchQuery("");
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close when clicking outside on desktop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Only trigger click outside close if it's desktop width (not mobile full modal)
        if (window.innerWidth >= 768) {
          setIsOpen(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (productId: string) => {
    onChange(productId);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full">
      {/* Hidden input for form action validation */}
      <input type="hidden" name={name} value={value} required={required} />

      {/* Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 text-left transition select-none"
      >
        <span className="truncate pr-4">
          {selectedProduct ? (
            <span className="font-medium text-foreground">
              {selectedProduct.namaBarang} ({selectedProduct.kodeBarang})
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Search Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs md:items-center p-0 md:p-4 animate-fade-in">
          {/* Modal Container */}
          <div
            ref={containerRef}
            className="w-full bg-card border border-border md:rounded-xl rounded-t-2xl shadow-xl flex flex-col max-h-[85vh] md:max-h-[70vh] md:max-w-lg overflow-hidden transition-all duration-200 animate-scale-in"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pt-5 pb-4 px-5 border-b border-border">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary flex-shrink-0" />
                <h3 className="font-bold text-sm text-foreground leading-none">Pilih Barang</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Input Box */}
            <div className="p-3 border-b border-border bg-muted/20">
              <div className="relative flex items-center">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik nama atau kode barang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card pl-9 pr-8 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 rounded-full p-1 text-muted-foreground hover:bg-muted transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Products Selection List */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/60 max-h-[50vh] md:max-h-[40vh] p-1">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((p) => {
                  const isSelected = p.id === value;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelect(p.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/80 flex flex-col gap-0.5 transition rounded-lg ${
                        isSelected ? "bg-primary/5 hover:bg-primary/10 border-l-4 border-primary pl-3" : ""
                      }`}
                    >
                      <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {p.namaBarang}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center justify-between">
                        <span>Kode: {p.kodeBarang}</span>
                        <span>
                          Stok: <span className="font-semibold text-foreground">{p.stok} {p.satuan}</span>
                        </span>
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 stroke-1 mb-2 text-muted-foreground/60" />
                  <p className="text-sm">Barang tidak ditemukan</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">Coba dengan kata kunci lainnya</p>
                </div>
              )}
            </div>

            {/* Modal Footer (Helper) */}
            <div className="bg-muted/30 px-4 py-3 text-center border-t border-border">
              <p className="text-[11px] text-muted-foreground">
                Menampilkan {filteredProducts.length} dari {products.length} total barang aktif.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
