import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/auth";
import {
  getDashboardStats,
  getLowStockProducts,
  getMonthlyStockData,
} from "@/actions/dashboard.actions";

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

    // 2. Ambil Statistik Dashboard secara Paralel
    const [stats, lowStockProducts, monthlyData] = await Promise.all([
      getDashboardStats(),
      getLowStockProducts(),
      getMonthlyStockData(),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      lowStockProducts,
      monthlyData,
    });
  } catch (error) {
    console.error("Error API mobile dashboard GET:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
