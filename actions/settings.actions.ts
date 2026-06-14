"use server";

import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { ActionResponse } from "@/types";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import fs from "node:fs/promises";
import path from "node:path";

// ── Get Activity Logs (Audit Logs) ────────────────────
export async function getActivityLogs() {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200, // Limit to recent 200 logs to prevent loading too much data
    });
    return logs;
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return [];
  }
}

// ── Get System Information ────────────────────────────
export async function getSystemInfo() {
  try {
    const dbPath = path.join(process.cwd(), "prisma", "sqlite");
    let dbSize = "0 B";

    try {
      const stats = await fs.stat(dbPath);
      const sizeInMB = stats.size / (1024 * 1024);
      dbSize = `${sizeInMB.toFixed(2)} MB (${stats.size.toLocaleString("id-ID")} bytes)`;
    } catch (err) {
      console.warn("Could not read database file size:", err);
    }

    const [
      totalProducts,
      totalCategories,
      totalUsers,
      totalStockIns,
      totalStockOuts,
      totalLogs,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.stockIn.count(),
      prisma.stockOut.count(),
      prisma.activityLog.count(),
    ]);

    return {
      dbSize,
      totalProducts,
      totalCategories,
      totalUsers,
      totalStockIns,
      totalStockOuts,
      totalLogs,
      nodeVersion: process.version,
      platform: process.platform,
    };
  } catch (error) {
    console.error("Error fetching system info:", error);
    return null;
  }
}

// ── Get Users List (Admin Only) ───────────────────────
export async function getUsers() {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return [];
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}

// ── Create User (Admin Only) ──────────────────────────
export async function createUser(
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, message: "Unauthorized: Hanya Admin yang bisa menambahkan user" };
  }

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string || "PETUGAS";

  if (!name || !email || !password) {
    return { success: false, message: "Nama, email, dan password wajib diisi" };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, message: "Email sudah terdaftar" };
    }

    const hashedPassword = await hash(password, 12);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isActive: true,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: "CREATE",
        tableName: "users",
        description: `Menambahkan user baru: ${name} (${email})`,
      },
    });

    revalidatePath("/settings/users");
    return { success: true, message: "User berhasil dibuat" };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, message: "Gagal membuat user" };
  }
}

// ── Toggle User Active Status (Admin Only) ────────────
export async function toggleUserStatus(id: string): Promise<ActionResponse> {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, message: "Unauthorized" };
  }

  if (currentUser.id === id) {
    return { success: false, message: "Tidak bisa menonaktifkan akun sendiri" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return { success: false, message: "User tidak ditemukan" };
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: "UPDATE",
        tableName: "users",
        description: `Mengubah status user ${user.name} menjadi ${updated.isActive ? "Aktif" : "Nonaktif"}`,
      },
    });

    revalidatePath("/settings/users");
    return {
      success: true,
      message: `User ${user.name} berhasil ${updated.isActive ? "diaktifkan" : "dinonaktifkan"}`,
    };
  } catch (error) {
    console.error("Error toggling user status:", error);
    return { success: false, message: "Gagal memperbarui status user" };
  }
}

// ── Reset User Password (Admin Only) ──────────────────
export async function resetUserPassword(
  id: string,
  prevState: any,
  formData: FormData
): Promise<ActionResponse> {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, message: "Unauthorized" };
  }

  const password = formData.get("password") as string;
  if (!password || password.length < 6) {
    return { success: false, message: "Password minimal 6 karakter" };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return { success: false, message: "User tidak ditemukan" };
    }

    const hashedPassword = await hash(password, 12);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        action: "UPDATE",
        tableName: "users",
        description: `Mereset password untuk user: ${user.name}`,
      },
    });

    return { success: true, message: `Password ${user.name} berhasil direset` };
  } catch (error) {
    console.error("Error resetting password:", error);
    return { success: false, message: "Gagal mereset password" };
  }
}
