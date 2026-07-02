import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMobileUser } from "@/lib/auth";
import { productSchema } from "@/lib/validations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Otentikasi User
    const user = await getMobileUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // 2. Cari produk berdasarkan ID atau Barcode
    const product = await prisma.product.findFirst({
      where: {
        isActive: true,
        OR: [
          { id: id },
          { barcode: id },
          { kodeBarang: id }
        ]
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Error API mobile product ID GET:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Otentikasi User & Cek Role (ADMIN)
    const user = await getMobileUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Hanya Admin yang dapat mengelola barang" }, { status: 403 });
    }

    const { id } = await params;

    // 2. Cek apakah barang ada
    const existingProduct = await prisma.product.findFirst({
      where: { id, isActive: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }

    // 3. Parse Body & Validasi
    const body = await request.json();
    const result = productSchema.safeParse(body);
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

    const raw = result.data;

    // 4. Cek Kode Barang Duplikat (jika kode barang diubah)
    if (raw.kodeBarang !== existingProduct.kodeBarang) {
      const duplicateCode = await prisma.product.findFirst({
        where: {
          kodeBarang: raw.kodeBarang,
          isActive: true,
          id: { not: id },
        },
      });

      if (duplicateCode) {
        return NextResponse.json(
          { success: false, message: `Kode barang "${raw.kodeBarang}" sudah digunakan` },
          { status: 400 }
        );
      }
    }

    // 5. Update Product
    const product = await prisma.product.update({
      where: { id },
      data: raw,
    });

    // 6. Catat Log Aktivitas
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        tableName: "products",
        description: `[Mobile] Memperbarui barang "${product.namaBarang}" (${product.kodeBarang})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Barang berhasil diperbarui",
      product,
    });
  } catch (error) {
    console.error("Error API mobile product ID PUT:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Otentikasi User & Cek Role (ADMIN)
    const user = await getMobileUser(request);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Hanya Admin yang dapat mengelola barang" }, { status: 403 });
    }

    const { id } = await params;

    // 2. Cek apakah barang ada
    const product = await prisma.product.findFirst({
      where: { id, isActive: true },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }

    // 3. Soft Delete (Set isActive = false)
    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // 4. Catat Log Aktivitas
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        tableName: "products",
        description: `[Mobile] Menghapus (nonaktif) barang "${product.namaBarang}" (${product.kodeBarang})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Barang berhasil dihapus",
    });
  } catch (error) {
    console.error("Error API mobile product ID DELETE:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
