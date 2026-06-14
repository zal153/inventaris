"use server";

import { compare } from "bcryptjs";
import prisma from "@/lib/prisma";
import { setSessionCookie, deleteSession, type SessionPayload } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import type { ActionResponse } from "@/types";

export async function loginAction(
  formData: FormData
): Promise<ActionResponse<SessionPayload>> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Validate
  const result = loginSchema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      message: "Validasi gagal",
      errors: result.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { email, password } = result.data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    return {
      success: false,
      message: "Email atau password salah",
    };
  }

  if (!user.isActive) {
    return {
      success: false,
      message: "Akun tidak aktif. Hubungi administrator.",
    };
  }

  // Verify password
  const isValid = await compare(password, user.password);
  if (!isValid) {
    return {
      success: false,
      message: "Email atau password salah",
    };
  }

  // Create session
  const sessionPayload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  await setSessionCookie(sessionPayload);

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: "LOGIN",
      tableName: "users",
      description: `${user.name} melakukan login`,
    },
  });

  return {
    success: true,
    message: "Login berhasil",
    data: sessionPayload,
  };
}

export async function logoutAction(): Promise<ActionResponse> {
  await deleteSession();
  return {
    success: true,
    message: "Logout berhasil",
  };
}
