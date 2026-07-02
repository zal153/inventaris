"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { stockInSchema } from "@/lib/validations";
import type { ActionResponse, StockInWithRelations } from "@/types";
import { generateKodeTransaksi } from "@/lib/utils";
import { revalidatePath, revalidateTag } from "next/cache";

// ── Get All Stock In Transactions ─────────────────────
export async function getStockIns(filters?: {
  startDate?: Date;
  endDate?: Date;
}): Promise<StockInWithRelations[]> {
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

    const data = await prisma.stockIn.findMany({
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

    return data as unknown as StockInWithRelations[];
  } catch (error) {
    console.error("Error fetching stock ins:", error);
    return [];
  }
}

// ── Auto Generate Stock In Code ─────────────────────
export async function generateStockInCode(): Promise<string> {
  try {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const prefix = `BM-${dateStr}-`;

    // Find the last existing code for today by prefix (timezone-safe)
    const lastRecord = await prisma.stockIn.findFirst({
      where: { kodeTransaksi: { startsWith: prefix } },
      orderBy: { kodeTransaksi: "desc" },
      select: { kodeTransaksi: true },
    });

    let sequence = 1;
    if (lastRecord) {
      const parts = lastRecord.kodeTransaksi.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    return `${prefix}${String(sequence).padStart(3, "0")}`;
  } catch (error) {
    console.error("Error generating stock in code:", error);
    return `BM-ERROR-${Date.now()}`; // unique fallback to avoid collision
  }
}

// ── Create Stock In Transaction ───────────────────────
export async function createStockIn(
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
    hargaBeli: formData.get("hargaBeli")
      ? Number(formData.get("hargaBeli"))
      : 0,
    tanggal: formData.get("tanggal")
      ? new Date(formData.get("tanggal") as string)
      : new Date(),
    catatan: (formData.get("catatan") as string) || null,
  };

  const result = stockInSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    // Fetch product name for activity log
    const product = await prisma.product.findUnique({
      where: { id: raw.productId },
      select: { namaBarang: true, kodeBarang: true },
    });

    if (!product) {
      return { success: false, message: "Barang tidak ditemukan" };
    }

    const code = await generateStockInCode();

    await prisma.$transaction(async (tx) => {
      // Increment stock and update hargaBeli
      await tx.product.update({
        where: { id: raw.productId },
        data: {
          stok: { increment: raw.jumlah },
          hargaBeli: raw.hargaBeli,
        },
      });

      // Create Stock In record
      await tx.stockIn.create({
        data: {
          kodeTransaksi: code,
          productId: raw.productId,
          jumlah: raw.jumlah,
          hargaBeli: raw.hargaBeli,
          tanggal: raw.tanggal,
          catatan: raw.catatan,
          userId: user.id,
        },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          tableName: "stockIns",
          description: `Mencatat barang masuk: ${raw.jumlah} ${product.namaBarang} (${code})`,
        },
      });
    });

    revalidatePath("/stock-in");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidateTag("products");
    return {
      success: true,
      message: "Barang masuk berhasil dicatat",
    };
  } catch (error) {
    console.error("Error creating stock in transaction:", error);
    return {
      success: false,
      message: "Gagal mencatat transaksi barang masuk.",
    };
  }
}

// ── Delete Stock In Transaction ───────────────────────
export async function deleteStockIn(id: string): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    // 1. Get Stock In detail
    const stockIn = await prisma.stockIn.findUnique({
      where: { id },
      include: {
        product: {
          select: { namaBarang: true, stok: true, satuan: true },
        },
      },
    });

    if (!stockIn) {
      return {
        success: false,
        message: "Transaksi barang masuk tidak ditemukan",
      };
    }

    // 2. Validate current stock before decrement
    if (stockIn.product.stok < stockIn.jumlah) {
      return {
        success: false,
        message: `Stok saat ini (${stockIn.product.stok} ${stockIn.product.satuan}) tidak mencukupi jika dikurangi kembali sebesar ${stockIn.jumlah} ${stockIn.product.satuan}.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // 3. Atomically decrement stock only if still sufficient
      const stockUpdate = await tx.product.updateMany({
        where: { id: stockIn.productId, stok: { gte: stockIn.jumlah } },
        data: { stok: { decrement: stockIn.jumlah } },
      });

      if (stockUpdate.count === 0) {
        throw new Error(`Stok tidak mencukupi untuk membatalkan transaksi ini.`);
      }

      // 4. Delete Stock In transaction
      await tx.stockIn.delete({ where: { id } });

      // 5. Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "DELETE",
          tableName: "stockIns",
          description: `Menghapus transaksi barang masuk: ${stockIn.jumlah} ${stockIn.product.namaBarang} (${stockIn.kodeTransaksi})`,
        },
      });
    });

    revalidatePath("/stock-in");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidateTag("products");

    return {
      success: true,
      message: "Transaksi barang masuk berhasil dihapus",
    };
  } catch (error: any) {
    console.error("Error deleting stock in transaction:", error);
    return {
      success: false,
      message: error.message || "Gagal menghapus transaksi barang masuk.",
    };
  }
}
