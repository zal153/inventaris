"use server";

import prisma from "@/lib/prisma";
import type { DashboardStats, LowStockProduct, MonthlyStockData } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalProducts,
    totalCategories,
    stockInToday,
    stockOutToday,
    allProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
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
    prisma.product.findMany({
      where: { isActive: true },
      select: { stok: true, minimumStok: true },
    }),
  ]);

  const lowStockCount = allProducts.filter(
    (p) => p.stok > 0 && p.stok <= p.minimumStok
  ).length;
  const outOfStockCount = allProducts.filter((p) => p.stok === 0).length;

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
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      kodeBarang: true,
      namaBarang: true,
      stok: true,
      minimumStok: true,
      stokIdeal: true,
      satuan: true,
    },
    orderBy: { stok: "asc" },
  });

  return products
    .filter((p) => p.stok <= p.minimumStok)
    .slice(0, 10);
}

export async function getMonthlyStockData(): Promise<MonthlyStockData[]> {
  const now = new Date();
  const months: MonthlyStockData[] = [];

  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const monthName = start.toLocaleDateString("id-ID", { month: "short" });

    const [masukCount, keluarCount] = await Promise.all([
      prisma.stockIn.aggregate({
        _sum: { jumlah: true },
        where: {
          tanggal: { gte: start, lte: end },
        },
      }),
      prisma.stockOut.aggregate({
        _sum: { jumlah: true },
        where: {
          tanggal: { gte: start, lte: end },
        },
      }),
    ]);

    months.push({
      month: monthName,
      masuk: masukCount._sum.jumlah || 0,
      keluar: keluarCount._sum.jumlah || 0,
    });
  }

  return months;
}
