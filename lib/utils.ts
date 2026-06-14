import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ── Merge Tailwind Classes ────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Format to Rupiah ──────────────────────────────────
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ── Generate Transaction Code ─────────────────────────
// Format: PREFIX-YYYYMMDD-XXX (e.g., BM-20240608-001)
export function generateKodeTransaksi(
  prefix: string,
  sequence: number,
): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `${prefix}-${date}-${String(sequence).padStart(3, '0')}`;
}

// ── Generate Product Code ─────────────────────────────
// Format: KAT-XXX (e.g., MKN-001)
export function generateKodeBarang(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(3, '0')}`;
}

// ── Format Date ───────────────────────────────────────
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

// ── Format DateTime ───────────────────────────────────
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

// ── Truncate String ───────────────────────────────────
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

// ── Get Stock Status ──────────────────────────────────
export function getStockStatus(
  stok: number,
  minimumStok: number,
): {
  label: string;
  color: 'success' | 'warning' | 'danger';
} {
  if (stok === 0) return { label: 'Habis', color: 'danger' };
  if (stok <= minimumStok) return { label: 'Menipis', color: 'warning' };
  return { label: 'Normal', color: 'success' };
}

// ── Delay ─────────────────────────────────────────────
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Category prefix map for product code ──────────────
export const CATEGORY_PREFIX: Record<string, string> = {
  'Bahan Pokok (Sembako)': 'SBK',
  'Bumbu & Bahan Dapur': 'BBD',
  Tepung: 'TPG',
  Minuman: 'MNM',
  Elektronik: 'ELK',
  ATK: 'ATK',
  Kebersihan: 'KBR',
  'Kemasan & Perlengkapan': 'KMP',
  Sparepart: 'SPR',
};

