"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { stockInSchema } from "@/lib/validations";
import type { ActionResponse, StockInWithRelations } from "@/types";
import { generateKodeTransaksi } from "@/lib/utils";
import { revalidatePath } from "next/cache";

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

// ── Auto Generate Stock In Code ──────────────────────
export async function generateStockInCode(): Promise<string> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await prisma.stockIn.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    return generateKodeTransaksi("BM", count + 1);
  } catch (error) {
    console.error("Error generating stock in code:", error);
    return "BM-ERROR-000";
  }
}

// ── Create Stock In Transaction ───────────────────────
export async function createStockIn(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const raw = {
    productId: formData.get("productId") as string,
    jumlah: formData.get("jumlah") ? Number(formData.get("jumlah")) : 0,
    hargaBeli: formData.get("hargaBeli") ? Number(formData.get("hargaBeli")) : 0,
    tanggal: formData.get("tanggal") ? new Date(formData.get("tanggal") as string) : new Date(),
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
    const code = await generateStockInCode();

    // Use transaction to ensure both stock in creation and product update succeed
    await prisma.$transaction(async (tx) => {
      // 1. Create Stock In
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

      // 2. Increment stock in Product
      await tx.product.update({
        where: { id: raw.productId },
        data: {
          stok: {
            increment: raw.jumlah,
          },
          // Optionally update product's hargaBeli if it changed
          hargaBeli: raw.hargaBeli,
        },
      });

      // 3. Log activity
      const product = await tx.product.findUnique({
        where: { id: raw.productId },
        select: { namaBarang: true, kodeBarang: true },
      });

      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          tableName: "stockIns",
          description: `Mencatat barang masuk: ${raw.jumlah} ${product?.namaBarang} (${code})`,
        },
      });
    });

    revalidatePath("/stock-in");
    revalidatePath("/products");
    revalidatePath("/dashboard");
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
