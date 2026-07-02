import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/auth";
import { getTransactionHistory } from "@/actions/report.actions";

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

    // 2. Baca Filter dari Query Parameters
    const url = new URL(request.url);
    const startDateStr = url.searchParams.get("startDate") || "";
    const endDateStr = url.searchParams.get("endDate") || "";
    const type = (url.searchParams.get("type") as "all" | "stock-in" | "stock-out") || "all";
    const categoryId = url.searchParams.get("categoryId") || undefined;
    const query = url.searchParams.get("query") || undefined;

    const filters = {
      startDate: startDateStr ? new Date(startDateStr) : undefined,
      endDate: endDateStr ? new Date(endDateStr) : undefined,
      type,
      categoryId,
      query,
    };

    // 3. Ambil Riwayat Transaksi
    const history = await getTransactionHistory(filters);

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Error API mobile transaction history GET:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
