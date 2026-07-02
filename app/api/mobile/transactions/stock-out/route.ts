import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMobileUser } from "@/lib/auth";
import { stockOutSchema } from "@/lib/validations";
import { generateStockOutCode } from "@/actions/stock-out.actions";
import { revalidatePath, revalidateTag } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    // 1. Otentikasi User
    const user = await getMobileUser(request);
    if (!user) {
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
      tujuan: body.tujuan || "",
      tanggal: body.tanggal ? new Date(body.tanggal) : new Date(),
      catatan: body.catatan || null,
    };

    const result = stockOutSchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validasi gagal",
          errors: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 3. Verifikasi Barang & Stok
    const product = await prisma.product.findUnique({
      where: { id: raw.productId },
      select: { stok: true, namaBarang: true, kodeBarang: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }

    if (product.stok < raw.jumlah) {
      return NextResponse.json(
        {
          success: false,
          message: `Stok tidak mencukupi. Stok saat ini: ${product.stok}, jumlah yang diminta: ${raw.jumlah}`,
        },
        { status: 400 }
      );
    }

    // 4. Generate Kode Transaksi
    const code = await generateStockOutCode();

    // 5. Kurangi stok secara aman & buat transaksi (Atomik)
    const success = await prisma.$transaction(async (tx) => {
      // Optimistic Locking: Kurangi stok hanya jika stok di DB masih mencukupi
      const stockUpdate = await tx.product.updateMany({
        where: { id: raw.productId, stok: { gte: raw.jumlah } },
        data: { stok: { decrement: raw.jumlah } },
      });

      if (stockUpdate.count === 0) {
        return false;
      }

      // Buat data transaksi barang keluar
      await tx.stockOut.create({
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

      // Catat log aktivitas
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          tableName: "stockOuts",
          description: `[Mobile] Mencatat barang keluar: ${raw.jumlah} ${product.namaBarang} (${code})`,
        },
      });

      return true;
    });

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          message: "Stok tidak mencukupi. Stok berubah saat transaksi, silakan coba lagi.",
        },
        { status: 400 }
      );
    }

    // Revalidasi cache
    revalidatePath("/stock-out");
    revalidatePath("/products");
    revalidatePath("/dashboard");
    revalidateTag("products");

    return NextResponse.json({
      success: true,
      message: "Barang keluar berhasil dicatat",
      kodeTransaksi: code,
    });
  } catch (error) {
    console.error("Error API mobile stock-out POST:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
