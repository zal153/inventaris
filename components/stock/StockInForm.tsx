"use client";

import { useActionState, useState, useEffect } from "react";
import { createStockIn, generateStockInCode } from "@/actions/stock-in.actions";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProductSearchSelect } from "@/components/shared/ProductSearchSelect";

interface StockInFormProps {
  products: { id: string; namaBarang: string; kodeBarang: string; stok: number; satuan: string; hargaBeli: number }[];
}

export function StockInForm({ products }: StockInFormProps) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createStockIn, null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState("");
  const [jumlah, setJumlah] = useState<number | "">("");
  const [hargaBeli, setHargaBeli] = useState<number | "">("");
  const [kodeTransaksi, setKodeTransaksi] = useState("Membuat kode...");

  // Fetch product details for helper info
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Generate transaction code on load
  useEffect(() => {
    async function loadCode() {
      const code = await generateStockInCode();
      setKodeTransaksi(code);
    }
    loadCode();
  }, []);

  // Update Harga Beli default when product changes
  useEffect(() => {
    if (selectedProduct) {
      setHargaBeli(selectedProduct.hargaBeli);
    } else {
      setHargaBeli("");
    }
  }, [selectedProductId, selectedProduct]);

  // Handle Action Responses
  useEffect(() => {
    if (state) {
      if (state.success) {
        toast.success(state.message);
        router.push("/stock-in");
        router.refresh();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, router]);

  return (
    <form action={action} className="space-y-6 w-full bg-card border border-border p-6 rounded-xl shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side */}
        <div className="space-y-4">
          {/* Transaction Code Display */}
          <div>
            <label className="block text-sm font-semibold text-muted-foreground mb-1">
              Kode Transaksi (Otomatis)
            </label>
            <div className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm font-mono text-foreground select-none">
              {kodeTransaksi}
            </div>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Pilih Barang <span className="text-destructive">*</span>
            </label>
            <ProductSearchSelect
              name="productId"
              value={selectedProductId}
              onChange={(id) => setSelectedProductId(id)}
              products={products}
              disabled={isPending}
              required
            />
            {state?.errors?.productId && (
              <p className="text-xs text-destructive mt-1">{state.errors.productId[0]}</p>
            )}

            {selectedProduct && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Stok saat ini: <span className="font-semibold text-foreground">{selectedProduct.stok} {selectedProduct.satuan}</span>
              </p>
            )}
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Jumlah Masuk <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="jumlah"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0"
                  min={1}
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 pr-12 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                {selectedProduct && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground select-none">
                    {selectedProduct.satuan}
                  </span>
                )}
              </div>
              {state?.errors?.jumlah && (
                <p className="text-xs text-destructive mt-1">{state.errors.jumlah[0]}</p>
              )}
            </div>

            <input type="hidden" name="hargaBeli" value="0" />
          </div>


          {/* Date Picker */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Tanggal Masuk <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              name="tanggal"
              defaultValue={new Date().toISOString().split("T")[0]}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {state?.errors?.tanggal && (
              <p className="text-xs text-destructive mt-1">{state.errors.tanggal[0]}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Catatan / Keterangan
            </label>
            <textarea
              name="catatan"
              placeholder="E.g., Restock bulanan, pengiriman dari supplier..."
              rows={3}
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link
          href="/stock-in"
          className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/30 transition"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-lg text-sm shadow-sm transition disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Catat Barang Masuk
        </button>
      </div>
    </form>
  );
}
