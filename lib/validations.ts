import { z } from "zod";

// ── Auth Schemas ──────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ── Product Schemas ───────────────────────────────────
export const productSchema = z.object({
  kodeBarang: z.string().min(1, "Kode barang wajib diisi"),
  namaBarang: z.string().min(1, "Nama barang wajib diisi"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  satuan: z.string().min(1, "Satuan wajib diisi"),
  hargaBeli: z.coerce.number().min(0, "Harga beli minimal 0").optional().default(0),
  hargaJual: z.coerce.number().min(0, "Harga jual minimal 0").optional().default(0),
  stok: z.coerce.number().int().min(0, "Stok minimal 0"),
  minimumStok: z.coerce.number().int().min(0, "Minimum stok minimal 0"),
  stokIdeal: z.coerce.number().int().min(0, "Stok ideal minimal 0"),
  barcode: z.string().optional().nullable(),
  deskripsi: z.string().optional().nullable(),
});

export type ProductFormData = z.infer<typeof productSchema>;

// ── Category Schemas ──────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi"),
  description: z.string().optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// ── Stock In Schemas ──────────────────────────────────
export const stockInSchema = z.object({
  productId: z.string().min(1, "Barang wajib dipilih"),
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1"),
  hargaBeli: z.coerce.number().min(0, "Harga beli minimal 0").optional().default(0),
  tanggal: z.coerce.date(),
  catatan: z.string().optional().nullable(),
});


export type StockInFormData = z.infer<typeof stockInSchema>;

// ── Stock Out Schemas ─────────────────────────────────
export const stockOutSchema = z.object({
  productId: z.string().min(1, "Barang wajib dipilih"),
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1"),
  tujuan: z.string().optional().nullable(),
  tanggal: z.coerce.date(),
  catatan: z.string().optional().nullable(),
});

export type StockOutFormData = z.infer<typeof stockOutSchema>;
