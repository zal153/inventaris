import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getMobileUser } from "@/lib/auth";
import { productSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    // 1. Otentikasi User
    const user = await getMobileUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Baca query parameters
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const categoryId = url.searchParams.get("categoryId") || "";

    // 3. Bangun filter database
    const where: any = { isActive: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { namaBarang: { contains: search, mode: "insensitive" } },
        { kodeBarang: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    // 4. Ambil data produk
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

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Error API mobile products GET:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Otentikasi User & Cek Role (ADMIN)
    const user = await getMobileUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Hanya Admin yang dapat mengelola barang" },
        { status: 403 }
      );
    }

    // 2. Parse Body & Validasi
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

    // 3. Cek Kode Barang Duplikat
    const existing = await prisma.product.findFirst({
      where: {
        kodeBarang: raw.kodeBarang,
        isActive: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: `Kode barang "${raw.kodeBarang}" sudah digunakan` },
        { status: 400 }
      );
    }

    // 4. Create Product
    const product = await prisma.product.create({
      data: {
        ...raw,
        isActive: true,
      },
    });

    // 5. Catat Log Aktivitas
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        tableName: "products",
        description: `[Mobile] Membuat barang baru "${product.namaBarang}" (${product.kodeBarang})`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Barang berhasil ditambahkan",
      product,
    });
  } catch (error) {
    console.error("Error API mobile products POST:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
