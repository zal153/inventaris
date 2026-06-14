"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { categorySchema } from "@/lib/validations";
import type { ActionResponse } from "@/types";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

// Wrap category fetch with unstable_cache
const getCachedCategories = unstable_cache(
  async () => {
    return prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  },
  ["categories"],
  { tags: ["categories"] }
);

// ── Get All Categories ────────────────────────────────
export async function getCategories() {
  try {
    return await getCachedCategories();
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// ── Create Category ───────────────────────────────────
export async function createCategory(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const raw = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
  };

  const result = categorySchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, description } = result.data;

  try {
    const existing = await prisma.category.findUnique({
      where: { name },
    });

    if (existing) {
      return {
        success: false,
        message: `Kategori dengan nama "${name}" sudah ada`,
      };
    }

    const category = await prisma.category.create({
      data: { name, description },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "CREATE",
        tableName: "categories",
        description: `Menambahkan kategori baru: ${name}`,
      },
    });

    revalidatePath("/categories");
    revalidateTag("categories");
    return {
      success: true,
      message: "Kategori berhasil ditambahkan",
    };
  } catch (error) {
    console.error("Error creating category:", error);
    return {
      success: false,
      message: "Gagal menambahkan kategori. Silakan coba lagi.",
    };
  }
}

// ── Update Category ───────────────────────────────────
export async function updateCategory(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  const raw = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
  };

  const result = categorySchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, description } = result.data;

  try {
    const existing = await prisma.category.findFirst({
      where: {
        name,
        id: { not: id },
      },
    });

    if (existing) {
      return {
        success: false,
        message: `Kategori dengan nama "${name}" sudah ada`,
      };
    }

    await prisma.category.update({
      where: { id },
      data: { name, description },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        tableName: "categories",
        description: `Mengubah kategori: ${name}`,
      },
    });

    revalidatePath("/categories");
    revalidateTag("categories");
    return {
      success: true,
      message: "Kategori berhasil diperbarui",
    };
  } catch (error) {
    console.error("Error updating category:", error);
    return {
      success: false,
      message: "Gagal memperbarui kategori. Silakan coba lagi.",
    };
  }
}

// ── Delete Category ───────────────────────────────────
export async function deleteCategory(id: string): Promise<ActionResponse> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      return {
        success: false,
        message: "Kategori tidak ditemukan",
      };
    }

    if (category._count.products > 0) {
      return {
        success: false,
        message: `Kategori "${category.name}" tidak dapat dihapus karena masih digunakan oleh ${category._count.products} produk`,
      };
    }

    await prisma.category.delete({
      where: { id },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        tableName: "categories",
        description: `Menghapus kategori: ${category.name}`,
      },
    });

    revalidatePath("/categories");
    revalidateTag("categories");
    return {
      success: true,
      message: "Kategori berhasil dihapus",
    };
  } catch (error) {
    console.error("Error deleting category:", error);
    return {
      success: false,
      message: "Gagal menghapus kategori. Silakan coba lagi.",
    };
  }
}
