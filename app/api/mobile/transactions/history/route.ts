import { NextRequest, NextResponse } from "next/server";
import { getMobileUser } from "@/lib/auth";
import { getTransactionHistory } from "@/actions/report.actions";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const start = Date.now();
  logger.info("API mobile transaction history GET initiated", { url: request.url });

  try {
    // 1. Otentikasi User
    const user = await getMobileUser(request);
    if (!user) {
      logger.warn("API mobile transaction history GET - Unauthorized");
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

    logger.info("API mobile transaction history GET completed successfully", {
      status: 200,
      duration: `${Date.now() - start}ms`,
      count: history.length,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    logger.error("Error API mobile transaction history GET failed", { url: request.url }, error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan internal server" },
      { status: 500 }
    );
  }
}
