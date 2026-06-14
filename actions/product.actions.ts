"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { productSchema } from "@/lib/validations";
import type { ActionResponse, ProductWithRelations } from "@/types";
import { revalidatePath } from "next/cache";
import { CATEGORY_PREFIX } from "@/lib/utils";
import fs from "node:fs/promises";
import path from "node:path";

// ── Get All Products ──────────────────────────────────
export async function getProducts(): Promise<ProductWithRelations[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
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
        namaBarang: "asc",
      },
    });
    return products as unknown as ProductWithRelations[];
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

// ── Get Product By ID ─────────────────────────────────
export async function getProductById(id: string): Promise<ProductWithRelations | null> {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id,
        isActive: true,
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
    return product as unknown as ProductWithRelations;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return null;
  }
}

// ── Auto Generate Product Code ────────────────────────
export async function generateProductCode(categoryId: string): Promise<string> {
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) return "BRG-000";

    const prefix = CATEGORY_PREFIX[category.name] || "BRG";

    // Find the latest product code starting with the prefix
    const latestProduct = await prisma.product.findFirst({
      where: {
        kodeBarang: {
          startsWith: `${prefix}-`,
        },
      },
      orderBy: {
        kodeBarang: "desc",
      },
    });

    let sequence = 1;
    if (latestProduct) {
      const match = latestProduct.kodeBarang.match(/\d+$/);
      if (match) {
        sequence = parseInt(match[0], 10) + 1;
      }
    }

    return `${prefix}-${String(sequence).padStart(3, "0")}`;
  } catch (error) {
    console.error("Error generating product code:", error);
    return "BRG-001";
  }
}

// ── Helper to Save Uploaded File ─────────────────────
async function saveUploadedFile(file: File | null): Promise<string | null> {
  if (!file || file.size === 0) return null;

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique file name
    const ext = path.extname(file.name) || ".png";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error("Error saving file:", error);
    return null;
  }
}

// ── Create Product ────────────────────────────────────
export async function createProduct(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const raw = {
    kodeBarang: formData.get("kodeBarang") as string,
    namaBarang: formData.get("namaBarang") as string,
    categoryId: formData.get("categoryId") as string,
    satuan: formData.get("satuan") as string,
    hargaBeli: formData.get("hargaBeli") ? Number(formData.get("hargaBeli")) : 0,
    hargaJual: formData.get("hargaJual") ? Number(formData.get("hargaJual")) : 0,
    stok: formData.get("stok") ? Number(formData.get("stok")) : 0,
    minimumStok: formData.get("minimumStok") ? Number(formData.get("minimumStok")) : 0,
    stokIdeal: formData.get("stokIdeal") ? Number(formData.get("stokIdeal")) : 20,
    barcode: (formData.get("barcode") as string) || null,
    deskripsi: (formData.get("deskripsi") as string) || null,
  };

  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    // Check if code already exists
    const existing = await prisma.product.findFirst({
      where: {
        kodeBarang: raw.kodeBarang,
        isActive: true,
      },
    });

    if (existing) {
      return {
        success: false,
        message: `Kode barang "${raw.kodeBarang}" sudah digunakan`,
      };
    }

    // Handle image file
    const file = formData.get("gambarFile") as File | null;
    const gambarPath = await saveUploadedFile(file);

    const product = await prisma.product.create({
      data: {
        ...result.data,
        gambar: gambarPath,
        stok: raw.stok, // safeParse coerces fields
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        tableName: "products",
        description: `Menambahkan produk baru: ${product.namaBarang} (${product.kodeBarang})`,
      },
    });

    revalidatePath("/products");
    return {
      success: true,
      message: "Produk berhasil ditambahkan",
    };
  } catch (error) {
    console.error("Error creating product:", error);
    return {
      success: false,
      message: "Gagal menambahkan produk. Silakan coba lagi.",
    };
  }
}

// ── Update Product ────────────────────────────────────
export async function updateProduct(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const raw = {
    kodeBarang: formData.get("kodeBarang") as string,
    namaBarang: formData.get("namaBarang") as string,
    categoryId: formData.get("categoryId") as string,
    satuan: formData.get("satuan") as string,
    hargaBeli: formData.get("hargaBeli") ? Number(formData.get("hargaBeli")) : 0,
    hargaJual: formData.get("hargaJual") ? Number(formData.get("hargaJual")) : 0,
    stok: formData.get("stok") ? Number(formData.get("stok")) : 0,
    minimumStok: formData.get("minimumStok") ? Number(formData.get("minimumStok")) : 0,
    stokIdeal: formData.get("stokIdeal") ? Number(formData.get("stokIdeal")) : 20,
    barcode: (formData.get("barcode") as string) || null,
    deskripsi: (formData.get("deskripsi") as string) || null,
  };

  const result = productSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    const existingCode = await prisma.product.findFirst({
      where: {
        kodeBarang: raw.kodeBarang,
        id: { not: id },
        isActive: true,
      },
    });

    if (existingCode) {
      return {
        success: false,
        message: `Kode barang "${raw.kodeBarang}" sudah digunakan`,
      };
    }

    const currentProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!currentProduct) {
      return {
        success: false,
        message: "Produk tidak ditemukan",
      };
    }

    // Handle image file upload
    const file = formData.get("gambarFile") as File | null;
    let gambarPath = currentProduct.gambar;

    if (file && file.size > 0) {
      // Delete old file if exists
      if (currentProduct.gambar) {
        try {
          const oldFilePath = path.join(process.cwd(), "public", currentProduct.gambar);
          await fs.unlink(oldFilePath);
        } catch (err) {
          console.warn("Could not delete old image:", err);
        }
      }
      gambarPath = await saveUploadedFile(file);
    }

    await prisma.product.update({
      where: { id },
      data: {
        ...result.data,
        gambar: gambarPath,
        stok: raw.stok, // Allow updating stock manually from product details (often requested for corrections)
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        tableName: "products",
        description: `Mengubah produk: ${result.data.namaBarang} (${result.data.kodeBarang})`,
      },
    });

    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    return {
      success: true,
      message: "Produk berhasil diperbarui",
    };
  } catch (error) {
    console.error("Error updating product:", error);
    return {
      success: false,
      message: "Gagal memperbarui produk. Silakan coba lagi.",
    };
  }
}

// ── Delete Product (Soft Delete) ──────────────────────
export async function deleteProduct(id: string): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockIns: true,
            stockOuts: true,
          },
        },
      },
    });

    if (!product) {
      return {
        success: false,
        message: "Produk tidak ditemukan",
      };
    }

    // If product has transaction history, soft delete by setting isActive to false.
    // Otherwise, perform hard delete to clean up the DB.
    if (product._count.stockIns > 0 || product._count.stockOuts > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      console.log(`Soft deleted product: ${product.namaBarang}`);
    } else {
      // Delete image file if exists
      if (product.gambar) {
        try {
          const filePath = path.join(process.cwd(), "public", product.gambar);
          await fs.unlink(filePath);
        } catch (err) {
          console.warn("Could not delete image file during hard delete:", err);
        }
      }

      await prisma.product.delete({
        where: { id },
      });
      console.log(`Hard deleted product: ${product.namaBarang}`);
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        tableName: "products",
        description: `Menghapus produk: ${product.namaBarang} (${product.kodeBarang})`,
      },
    });

    revalidatePath("/products");
    return {
      success: true,
      message: "Produk berhasil dihapus",
    };
  } catch (error) {
    console.error("Error deleting product:", error);
    return {
      success: false,
      message: "Gagal menghapus produk. Silakan coba lagi.",
    };
  }
}

// ── Batch Import Products (from Excel / JSON Array) ───
export async function importProducts(productsList: any[]): Promise<ActionResponse<{ imported: number; skipped: number }>> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  let imported = 0;
  let skipped = 0;

  try {
    for (const item of productsList) {
      // Find category ID by name
      const category = await prisma.category.findUnique({
        where: { name: item.kategori },
      });

      if (!category) {
        skipped++;
        continue;
      }

      // Check duplicate kodeBarang
      const existing = await prisma.product.findUnique({
        where: { kodeBarang: item.kodeBarang },
      });

      if (existing) {
        if (!existing.isActive) {
          // Reactivate soft deleted product
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              namaBarang: item.namaBarang,
              categoryId: category.id,
              satuan: item.satuan || "pcs",
              hargaBeli: Number(item.hargaBeli) || 0,
              hargaJual: Number(item.hargaJual) || 0,
              stok: Number(item.stok) || 0,
              minimumStok: Number(item.minimumStok) || 5,
              stokIdeal: Number(item.stokIdeal) || 20,
              deskripsi: item.deskripsi || null,
              isActive: true,
            },
          });
          imported++;
        } else {
          skipped++;
        }
        continue;
      }

      await prisma.product.create({
        data: {
          kodeBarang: item.kodeBarang,
          namaBarang: item.namaBarang,
          categoryId: category.id,
          satuan: item.satuan || "pcs",
          hargaBeli: Number(item.hargaBeli) || 0,
          hargaJual: Number(item.hargaJual) || 0,
          stok: Number(item.stok) || 0,
          minimumStok: Number(item.minimumStok) || 5,
          stokIdeal: Number(item.stokIdeal) || 20,
          deskripsi: item.deskripsi || null,
        },
      });

      imported++;
    }

    if (imported > 0) {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          tableName: "products",
          description: `Mengimpor ${imported} produk baru dari Excel`,
        },
      });
      revalidatePath("/products");
    }

    return {
      success: true,
      message: `Impor produk selesai: ${imported} berhasil, ${skipped} dilewati`,
      data: { imported, skipped },
    };
  } catch (error) {
    console.error("Error importing products:", error);
    return {
      success: false,
      message: "Gagal mengimpor produk. Cek format file Excel Anda.",
    };
  }
}
