// ── Shared TypeScript Types ───────────────────────────

export type UserRole = "ADMIN";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

// ── API Response Types ────────────────────────────────
export interface ActionResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// ── Dashboard Types ───────────────────────────────────
export interface DashboardStats {
  totalProducts: number;
  totalCategories: number;
  stockInToday: number;
  stockOutToday: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface LowStockProduct {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  stok: number;
  minimumStok: number;
  stokIdeal: number;
  satuan: string;
}

export interface MonthlyStockData {
  month: string;
  masuk: number;
  keluar: number;
}

// ── Table Types ───────────────────────────────────────
export interface ProductWithRelations {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  stok: number;
  minimumStok: number;
  stokIdeal: number;
  hargaBeli: number;
  hargaJual: number;
  satuan: string;
  barcode: string | null;
  gambar: string | null;
  deskripsi: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  category: {
    id: string;
    name: string;
  };
}

export interface StockInWithRelations {
  id: string;
  kodeTransaksi: string;
  jumlah: number;
  hargaBeli: number;
  tanggal: Date;
  catatan: string | null;
  createdAt: Date;
  product: {
    id: string;
    kodeBarang: string;
    namaBarang: string;
    satuan: string;
  };
  user: {
    name: string;
  };
}

export interface StockOutWithRelations {
  id: string;
  kodeTransaksi: string;
  jumlah: number;
  tujuan: string | null;
  tanggal: Date;
  catatan: string | null;
  createdAt: Date;
  product: {
    id: string;
    kodeBarang: string;
    namaBarang: string;
    satuan: string;
  };
  user: {
    name: string;
  };
}

// ── History / Combined Transaction ────────────────────
export interface TransactionHistory {
  id: string;
  kodeTransaksi: string;
  type: "MASUK" | "KELUAR";
  namaBarang: string;
  kodeBarang: string;
  jumlah: number;
  satuan: string;
  tanggal: Date;
  catatan: string | null;
  tujuan?: string | null;
  userName: string;
}

// ── Report Filter ─────────────────────────────────────
export interface ReportFilter {
  startDate: Date;
  endDate: Date;
  categoryId?: string;
  type?: "stock-in" | "stock-out" | "all";
}

// ── Navigation ────────────────────────────────────────
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  badge?: number;
  children?: NavItem[];
}
