"use server";

import prisma from "@/lib/prisma";
import type { TransactionHistory, ProductWithRelations } from "@/types";

interface HistoryFilters {
  startDate?: Date;
  endDate?: Date;
  type?: "all" | "stock-in" | "stock-out";
  categoryId?: string;
  query?: string;
}

// ── Get Combined Transaction History ──────────────────
export async function getTransactionHistory(
  filters?: HistoryFilters
): Promise<TransactionHistory[]> {
  try {
    const { startDate, endDate, type = "all", categoryId, query } = filters || {};

    const start = startDate ? new Date(startDate) : undefined;
    if (start) start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : undefined;
    if (end) end.setHours(23, 59, 59, 999);

    const dateFilter: any = {};
    if (start) dateFilter.gte = start;
    if (end) dateFilter.lte = end;

    // Build common product filter
    const productWhere: any = {};
    if (categoryId) {
      productWhere.categoryId = categoryId;
    }
    if (query) {
      productWhere.OR = [
        { namaBarang: { contains: query } },
        { kodeBarang: { contains: query } },
      ];
    }

    let stockIns: any[] = [];
    let stockOuts: any[] = [];

    // Fetch Stock In if type is 'all' or 'stock-in'
    if (type === "all" || type === "stock-in") {
      const where: any = {};
      if (start || end) where.tanggal = dateFilter;
      if (categoryId || query) where.product = productWhere;

      stockIns = await prisma.stockIn.findMany({
        where,
        include: {
          product: {
            select: {
              namaBarang: true,
              kodeBarang: true,
              satuan: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    // Fetch Stock Out if type is 'all' or 'stock-out'
    if (type === "all" || type === "stock-out") {
      const where: any = {};
      if (start || end) where.tanggal = dateFilter;
      if (categoryId || query) where.product = productWhere;

      stockOuts = await prisma.stockOut.findMany({
        where,
        include: {
          product: {
            select: {
              namaBarang: true,
              kodeBarang: true,
              satuan: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    // Map into shared format
    const historyIn: TransactionHistory[] = stockIns.map((item) => ({
      id: item.id,
      kodeTransaksi: item.kodeTransaksi,
      type: "MASUK",
      namaBarang: item.product.namaBarang,
      kodeBarang: item.product.kodeBarang,
      jumlah: item.jumlah,
      satuan: item.product.satuan,
      tanggal: item.tanggal,
      catatan: item.catatan,
      userName: item.user.name,
    }));

    const historyOut: TransactionHistory[] = stockOuts.map((item) => ({
      id: item.id,
      kodeTransaksi: item.kodeTransaksi,
      type: "KELUAR",
      namaBarang: item.product.namaBarang,
      kodeBarang: item.product.kodeBarang,
      jumlah: item.jumlah,
      satuan: item.product.satuan,
      tanggal: item.tanggal,
      catatan: item.catatan,
      tujuan: item.tujuan,
      userName: item.user.name,
    }));

    // Combine and sort by date descending
    const combined = [...historyIn, ...historyOut].sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    );

    return combined;
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return [];
  }
}

// ── Get Stock Report (all active products with category/supplier info) ─
export async function getStockReport(categoryId?: string): Promise<ProductWithRelations[]> {
  try {
    const where: any = { isActive: true };
    if (categoryId) {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        namaBarang: "asc",
      },
    });

    return products as unknown as ProductWithRelations[];
  } catch (error) {
    console.error("Error fetching stock report:", error);
    return [];
  }
}

// ── Get Low Stock Report (where stock <= minStock) ────
export async function getLowStockReport(categoryId?: string): Promise<ProductWithRelations[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        stok: {
          lte: prisma.product.fields.minimumStok,
        },
        categoryId: categoryId || undefined,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        stok: "asc",
      },
    });

    return products as unknown as ProductWithRelations[];
  } catch (error) {
    console.error("Error fetching low stock report:", error);
    return [];
  }
}
