"use server";

import prisma from "@/lib/prisma";
import type { DashboardStats, LowStockProduct, MonthlyStockData } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalCategories,
    stockInToday,
    stockOutToday,
    totalProducts,
    outOfStockCount,
    lowStockResult,
  ] = await Promise.all([
    prisma.category.count(),
    prisma.stockIn.count({
      where: {
        tanggal: { gte: today, lt: tomorrow },
      },
    }),
    prisma.stockOut.count({
      where: {
        tanggal: { gte: today, lt: tomorrow },
      },
    }),
    prisma.product.count({
      where: { isActive: true },
    }),
    prisma.product.count({
      where: { isActive: true, stok: 0 },
    }),
    prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "Product"
      WHERE "isActive" = true AND stok > 0 AND stok <= "minimumStok"
    `,
  ]);

  const lowStockCount = Number(lowStockResult[0]?.count || 0);

  return {
    totalProducts,
    totalCategories,
    stockInToday,
    stockOutToday,
    lowStockCount,
    outOfStockCount,
  };
}

export async function getLowStockProducts(): Promise<LowStockProduct[]> {
  try {
    const products = await prisma.$queryRaw<any[]>`
      SELECT id, "kodeBarang", "namaBarang", stok, "minimumStok", "stokIdeal", satuan
      FROM "Product"
      WHERE "isActive" = true AND stok <= "minimumStok"
      ORDER BY stok ASC
      LIMIT 10
    `;
    return products.map((p) => ({
      id: p.id,
      kodeBarang: p.kodeBarang,
      namaBarang: p.namaBarang,
      stok: Number(p.stok),
      minimumStok: Number(p.minimumStok),
      stokIdeal: Number(p.stokIdeal),
      satuan: p.satuan,
    }));
  } catch (error) {
    console.error("Error fetching low stock products:", error);
    return [];
  }
}

export async function getMonthlyStockData(): Promise<MonthlyStockData[]> {
  const now = new Date();
  
  // Ambil data dari 5 bulan lalu (awal bulan) sampai akhir bulan ini
  const startRange = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
  const endRange = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Jalankan 2 query untuk mengambil seluruh data transaksi masuk dan keluar
  const [stockInList, stockOutList] = await Promise.all([
    prisma.stockIn.findMany({
      where: {
        tanggal: { gte: startRange, lte: endRange },
      },
      select: {
        tanggal: true,
        jumlah: true,
      },
    }),
    prisma.stockOut.findMany({
      where: {
        tanggal: { gte: startRange, lte: endRange },
      },
      select: {
        tanggal: true,
        jumlah: true,
      },
    }),
  ]);

  const months: MonthlyStockData[] = [];

  // Hitung agregasi per bulan di memori (in-memory aggregation)
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
    const monthName = start.toLocaleDateString("id-ID", { month: "short" });

    const masuk = stockInList
      .filter((item) => item.tanggal >= start && item.tanggal <= end)
      .reduce((sum, item) => sum + item.jumlah, 0);

    const keluar = stockOutList
      .filter((item) => item.tanggal >= start && item.tanggal <= end)
      .reduce((sum, item) => sum + item.jumlah, 0);

    months.push({
      month: monthName,
      masuk,
      keluar,
    });
  }

  return months;
}
