import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { createToken, type SessionPayload } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1. Validasi Input
    const result = loginSchema.safeParse(body);
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

    const { email, password } = result.data;

    // 2. Cari Pengguna
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Akun tidak aktif. Hubungi administrator." },
        { status: 403 }
      );
    }

    // 3. Verifikasi Password
    const isValid = await compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah" },
        { status: 401 }
      );
    }

    // 4. Buat Token Sesi (JWT)
    const sessionPayload: SessionPayload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await createToken(sessionPayload);

    // 5. Catat Log Aktivitas
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        tableName: "users",
        description: `[Mobile] ${user.name} melakukan login dari aplikasi mobile`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Login berhasil",
      token,
      user: sessionPayload,
    });
  } catch (error) {
    console.error("Error API mobile login:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
