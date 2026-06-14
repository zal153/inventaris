"use client";

import { useActionState, useState, useEffect } from "react";
import { createStockOut, generateStockOutCode } from "@/actions/stock-out.actions";
import { Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StockOutFormProps {
  products: { id: string; namaBarang: string; kodeBarang: string; stok: number; satuan: string }[];
}

export function StockOutForm({ products }: StockOutFormProps) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(createStockOut, null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState("");
  const [jumlah, setJumlah] = useState<number | "">("");
  const [tujuan, setTujuan] = useState("");
  const [kodeTransaksi, setKodeTransaksi] = useState("Membuat kode...");

  // Fetch product details for helper info
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Generate transaction code on load
  useEffect(() => {
    async function loadCode() {
      const code = await generateStockOutCode();
      setKodeTransaksi(code);
    }
    loadCode();
  }, []);

  // Handle Action Responses
  useEffect(() => {
    if (state) {
      if (state.success) {
        toast.success(state.message);
        router.push("/stock-out");
        router.refresh();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, router]);

  // Real-time stock validations
  const isStockInsufficient = selectedProduct && jumlah !== "" && jumlah > selectedProduct.stok;

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
            <select
              name="productId"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Cari / Pilih Barang</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.namaBarang} ({p.kodeBarang}) — Tersedia: {p.stok} {p.satuan}
                </option>
              ))}
            </select>
            {state?.errors?.productId && (
              <p className="text-xs text-destructive mt-1">{state.errors.productId[0]}</p>
            )}

            {selectedProduct && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Stok saat ini: <span className="font-semibold text-foreground">{selectedProduct.stok} {selectedProduct.satuan}</span>
              </p>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Tanggal Keluar <span className="text-destructive">*</span>
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
        </div>

        {/* Right Side */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Jumlah Keluar <span className="text-destructive">*</span>
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
                  className={`w-full rounded-lg border bg-card px-3 py-2 pr-12 text-sm text-foreground outline-none focus:ring-1 disabled:opacity-50 ${
                    isStockInsufficient
                      ? "border-destructive focus:border-destructive focus:ring-destructive"
                      : "border-border focus:border-primary focus:ring-primary"
                  }`}
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

              {isStockInsufficient && (
                <div className="flex items-center gap-1.5 text-xs text-destructive mt-1.5 font-medium animate-pulse">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Stok tidak mencukupi! Tersedia hanya {selectedProduct.stok} {selectedProduct.satuan}.</span>
                </div>
              )}
            </div>

            {/* Tujuan */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Tujuan Pengeluaran <span className="text-destructive">*</span>
              </label>
              <select
                name="tujuan"
                value={tujuan}
                onChange={(e) => setTujuan(e.target.value)}
                required
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="">Pilih Tujuan</option>
                <option value="Penjualan">Penjualan / Toko</option>
                <option value="Retur">Retur Barang</option>
                <option value="Rusak">Barang Rusak / Kadaluarsa</option>
                <option value="Kebutuhan Internal">Kebutuhan Internal Gudang</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Catatan / Keterangan
            </label>
            <textarea
              name="catatan"
              placeholder="E.g., Kirim ke cabang utama, buang karena cacat pabrik..."
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
          href="/stock-out"
          className="rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/30 transition"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isPending || isStockInsufficient || !selectedProductId}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-2.5 rounded-lg text-sm shadow-sm transition disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Catat Barang Keluar
        </button>
      </div>
    </form>
  );
}
