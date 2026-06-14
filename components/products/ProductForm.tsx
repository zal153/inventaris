"use client";

import { useActionState, useState, useEffect } from "react";
import { createProduct, updateProduct, generateProductCode } from "@/actions/product.actions";
import type { ActionResponse, ProductWithRelations } from "@/types";
import { Loader2, Sparkles, Image as ImageIcon, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ProductFormProps {
  categories: { id: string; name: string }[];
  initialData?: ProductWithRelations | null;
}

export function ProductForm({ categories, initialData }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const formAction = isEdit
    ? updateProduct.bind(null, initialData.id)
    : createProduct;

  const [state, action, isPending] = useActionState(formAction, null);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState(initialData?.category.id || "");
  const [kodeBarang, setKodeBarang] = useState(initialData?.kodeBarang || "");
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.gambar || null);
  const [generatingCode, setGeneratingCode] = useState(false);

  // Trigger toast on success or error
  useEffect(() => {
    if (state) {
      if (state.success) {
        toast.success(state.message);
        router.push("/products");
        router.refresh();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, router]);

  // Handle generating code
  const handleGenerateCode = async () => {
    if (!selectedCategory) {
      toast.warning("Silakan pilih kategori terlebih dahulu");
      return;
    }
    setGeneratingCode(true);
    try {
      const code = await generateProductCode(selectedCategory);
      setKodeBarang(code);
      toast.info(`Kode berhasil digenerate: ${code}`);
    } catch (err) {
      toast.error("Gagal generate kode barang");
    } finally {
      setGeneratingCode(false);
    }
  };

  // Image upload preview
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    const input = document.getElementById("gambarFile") as HTMLInputElement;
    if (input) input.value = "";
  };

  return (
    <form action={action} className="space-y-6 w-full bg-card border border-border p-6 rounded-xl shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Product Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Kategori <span className="text-destructive">*</span>
            </label>
            <select
              name="categoryId"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="">Pilih Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {state?.errors?.categoryId && (
              <p className="text-xs text-destructive mt-1">{state.errors.categoryId[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Kode Barang <span className="text-destructive">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                name="kodeBarang"
                placeholder="E.g., MKN-001"
                value={kodeBarang}
                onChange={(e) => setKodeBarang(e.target.value)}
                required
                disabled={isPending}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 font-mono"
              />
              {!isEdit && (
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  disabled={generatingCode || isPending || !selectedCategory}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide border border-primary/20 transition disabled:opacity-40"
                >
                  {generatingCode ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Auto
                </button>
              )}
            </div>
            {state?.errors?.kodeBarang && (
              <p className="text-xs text-destructive mt-1">{state.errors.kodeBarang[0]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Nama Barang <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="namaBarang"
              placeholder="Nama Lengkap Barang"
              defaultValue={initialData?.namaBarang || ""}
              required
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {state?.errors?.namaBarang && (
              <p className="text-xs text-destructive mt-1">{state.errors.namaBarang[0]}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Satuan <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="satuan"
                placeholder="E.g., pcs, botol, pack"
                defaultValue={initialData?.satuan || "pcs"}
                required
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {state?.errors?.satuan && (
                <p className="text-xs text-destructive mt-1">{state.errors.satuan[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Stok Awal
              </label>
              <input
                type="number"
                name="stok"
                placeholder="0"
                defaultValue={initialData?.stok ?? 0}
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {state?.errors?.stok && (
                <p className="text-xs text-destructive mt-1">{state.errors.stok[0]}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Details & Images */}
        <div className="space-y-4">
          <input type="hidden" name="hargaBeli" value={initialData?.hargaBeli ?? 0} />
          <input type="hidden" name="hargaJual" value={initialData?.hargaJual ?? 0} />


          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Minimum Stok <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="minimumStok"
                placeholder="5"
                defaultValue={initialData?.minimumStok ?? 5}
                required
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {state?.errors?.minimumStok && (
                <p className="text-xs text-destructive mt-1">{state.errors.minimumStok[0]}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Stok Ideal <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                name="stokIdeal"
                placeholder="20"
                defaultValue={initialData?.stokIdeal ?? 20}
                required
                disabled={isPending}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {state?.errors?.stokIdeal && (
                <p className="text-xs text-destructive mt-1">{state.errors.stokIdeal[0]}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Barcode / EAN (Opsional)
            </label>
            <input
              type="text"
              name="barcode"
              placeholder="E.g., 8991234567890"
              defaultValue={initialData?.barcode || ""}
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Deskripsi Produk
            </label>
            <textarea
              name="deskripsi"
              placeholder="Tambahkan detail deskripsi mengenai produk ini..."
              rows={3}
              defaultValue={initialData?.deskripsi || ""}
              disabled={isPending}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 resize-none"
            />
          </div>

          {/* Image Upload field */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              Foto Produk (Maks 2MB)
            </label>
            <div className="mt-1 flex items-center gap-4">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 overflow-hidden">
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute right-1 top-1 rounded-full bg-destructive text-white p-1 hover:bg-destructive/90 transition shadow"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  id="gambarFile"
                  name="gambarFile"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isPending}
                  className="w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary file:cursor-pointer hover:file:bg-primary/20 disabled:opacity-50"
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  Format yang didukung: JPG, JPEG, PNG, WEBP.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link
          href="/products"
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
          {isEdit ? "Simpan Perubahan" : "Tambah Produk"}
        </button>
      </div>
    </form>
  );
}
