import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const start = Date.now();
  let dbStatus = "DOWN";
  let dbResponseTime = 0;

  try {
    const dbStart = Date.now();
    // Run a basic raw query to test connection to Supabase database
    await prisma.$queryRaw`SELECT 1`;
    dbResponseTime = Date.now() - dbStart;
    dbStatus = "UP";
  } catch (error) {
    console.error("Healthcheck DB check failed:", error);
  }

  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();

  const status = dbStatus === "UP" ? "UP" : "DEGRADED";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      responseTime: `${Date.now() - start}ms`,
      details: {
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`,
        },
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        },
      },
    },
    {
      status: status === "UP" ? 200 : 500,
    }
  );
}
