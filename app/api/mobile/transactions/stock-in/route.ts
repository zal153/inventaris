import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMobileUser } from "@/lib/auth";
import { stockInSchema } from "@/lib/validations";
import { generateStockInCode } from "@/actions/stock-in.actions";
import { revalidatePath, revalidateTag } from "next/cache";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const start = Date.now();
  logger.info("API mobile stock-in POST initiated");

  try {
    // 1. Otentikasi User
    const user = await getMobileUser(request);
    if (!user) {
      logger.warn("API mobile stock-in POST - Unauthorized");
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // 2. Parse & Validasi Input
    const raw = {
      productId: body.productId,
      jumlah: body.jumlah ? Number(body.jumlah) : 0,
      hargaBeli: body.hargaBeli ? Number(body.hargaBeli) : 0,
      tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
      catatan: body.catatan || null,
    };

    const result = stockInSchema.safeParse(raw);
    if (!result.success) {
      logger.warn("API mobile stock-in POST validation failed", {
        errors: result.error.flatten().fieldErrors,
      });
      return NextResponse.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 3. Verifikasi Barang
    const product = await prisma.product.findUnique({
      where: { id: raw.productId },
      select: { namaBarang: true, kodeBarang: true },
    });

    if (!product) {
      logger.warn("API mobile stock-in POST - Product not found", { productId: raw.productId });
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }

    // 4. Generate Kode Transaksi & Tulis ke Database (Atomik)
    const code = await generateStockInCode();

    await prisma.$transaction(async (tx) => {
      // Tambah stok & update harga beli barang
      await tx.product.update({
        where: { id: raw.productId },
        data: {
          stok: { increment: raw.jumlah },
          hargaBeli: raw.hargaBeli,
        },
      });

      // Buat data transaksi barang masuk
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

      // Catat log aktivitas
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          tableName: "stockIns",
          description: `[Mobile] Mencatat barang masuk: ${raw.jumlah} ${product.namaBarang} (${code})`,
        },
      });
    });

    // Revalidasi cache
    revalidatePath("/stock-in");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidateTag("products");

    logger.info("API mobile stock-in POST completed successfully", {
      status: 200,
      duration: `${Date.now() - start}ms`,
      kodeTransaksi: code,
      productId: raw.productId,
      productName: product.namaBarang,
      qty: raw.jumlah,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Barang masuk berhasil dicatat",
      kodeTransaksi: code,
    });
  } catch (error) {
    logger.error("API mobile stock-in POST failed", {}, error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
