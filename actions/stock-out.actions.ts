"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { stockOutSchema } from "@/lib/validations";
import type { ActionResponse, StockOutWithRelations } from "@/types";
import { generateKodeTransaksi } from "@/lib/utils";
import { revalidatePath, revalidateTag } from "next/cache";

// ── Get All Stock Out Transactions ────────────────────
export async function getStockOuts(filters?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<StockOutWithRelations[]> {
  try {
    const where: any = {};

    if (filters?.startDate || filters?.endDate) {
      where.tanggal = {};
      if (filters.startDate) {
        const start = new Date(filters.startDate);
        start.setHours(0, 0, 0, 0);
        where.tanggal.gte = start;
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.tanggal.lte = end;
      }
    }

    const data = await prisma.stockOut.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            kodeBarang: true,
            namaBarang: true,
            satuan: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        tanggal: "desc",
      },
    });

    return data as unknown as StockOutWithRelations[];
  } catch (error) {
    console.error("Error fetching stock outs:", error);
    return [];
  }
}

// ── Auto Generate Stock Out Code ─────────────────────
export async function generateStockOutCode(): Promise<string> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await prisma.stockOut.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return generateKodeTransaksi("BK", count + 1);
  } catch (error) {
    console.error("Error generating stock out code:", error);
    return "BK-ERROR-000";
  }
}

// ── Create Stock Out Transaction ─────────────────────
export async function createStockOut(
  prevState: any,
  formData: FormData,
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const raw = {
    productId: formData.get("productId") as string,
    jumlah: formData.get("jumlah") ? Number(formData.get("jumlah")) : 0,
    tujuan: (formData.get("tujuan") as string) || "",
    tanggal: formData.get("tanggal")
      ? new Date(formData.get("tanggal") as string)
      : new Date(),
    catatan: (formData.get("catatan") as string) || null,
  };

  const result = stockOutSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: raw.productId },
      select: { stok: true, namaBarang: true, kodeBarang: true },
    });

    if (!product) {
      return {
        success: false,
        message: "Barang tidak ditemukan",
      };
    }

    if (product.stok < raw.jumlah) {
      return {
        success: false,
        message: `Stok tidak mencukupi. Stok saat ini: ${product.stok}, jumlah yang diminta: ${raw.jumlah}`,
      };
    }

    const code = await generateStockOutCode();

    // Atomically decrement stock only if still sufficient (optimistic locking)
    const stockUpdate = await prisma.product.updateMany({
      where: { id: raw.productId, stok: { gte: raw.jumlah } },
      data: { stok: { decrement: raw.jumlah } },
    });

    if (stockUpdate.count === 0) {
      return {
        success: false,
        message: `Stok tidak mencukupi. Stok berubah saat transaksi, silakan coba lagi.`,
      };
    }

    try {
      // Create Stock Out record
      await prisma.stockOut.create({
        data: {
          kodeTransaksi: code,
          productId: raw.productId,
          jumlah: raw.jumlah,
          tujuan: raw.tujuan,
          tanggal: raw.tanggal,
          catatan: raw.catatan,
          userId: user.id,
        },
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          tableName: "stockOuts",
          description: `Mencatat barang keluar: ${raw.jumlah} ${product.namaBarang} (${code})`,
        },
      });
    } catch (writeError) {
      // Rollback stock decrement if subsequent writes fail
      await prisma.product.update({
        where: { id: raw.productId },
        data: { stok: { increment: raw.jumlah } },
      });
      throw writeError;
    }

    revalidatePath("/stock-out");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidateTag("products");
    return {
      success: true,
      message: "Barang keluar berhasil dicatat",
    };
  } catch (error) {
    console.error("Error creating stock out transaction:", error);
    return {
      success: false,
      message: "Gagal mencatat transaksi barang keluar.",
    };
  }
}

// ── Delete Stock Out Transaction ──────────────────────
export async function deleteStockOut(id: string): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    // 1. Get Stock Out detail
    const stockOut = await prisma.stockOut.findUnique({
      where: { id },
      include: {
        product: {
          select: { namaBarang: true },
        },
      },
    });

    if (!stockOut) {
      return {
        success: false,
        message: "Transaksi barang keluar tidak ditemukan",
      };
    }

    // 2. Increment product stock (return item to warehouse)
    await prisma.product.update({
      where: { id: stockOut.productId },
      data: { stok: { increment: stockOut.jumlah } },
    });

    try {
      // 3. Delete Stock Out transaction
      await prisma.stockOut.delete({ where: { id } });

      // 4. Log activity
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          tableName: "stockOuts",
          description: `Menghapus transaksi barang keluar: ${stockOut.jumlah} ${stockOut.product.namaBarang} (${stockOut.kodeTransaksi})`,
        },
      });
    } catch (writeError) {
      // Rollback stock increment if delete/log fails
      await prisma.product.update({
        where: { id: stockOut.productId },
        data: { stok: { decrement: stockOut.jumlah } },
      });
      throw writeError;
    }

    revalidatePath("/stock-out");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidateTag("products");

    return {
      success: true,
      message: "Transaksi barang keluar berhasil dihapus",
    };
  } catch (error: any) {
    console.error("Error deleting stock out transaction:", error);
    return {
      success: false,
      message: error.message || "Gagal menghapus transaksi barang keluar.",
    };
  }
}
