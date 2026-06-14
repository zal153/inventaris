import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbPath = path.join(process.cwd(), "prisma", "sqlite");

    // Check if file exists
    try {
      await fs.access(dbPath);
    } catch {
      return NextResponse.json({ error: "Database file not found" }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(dbPath);

    // Log the backup activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "UPDATE",
        tableName: "sqlite",
        description: "Melakukan unduhan backup database SQLite",
      },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `stocksync_backup_${timestamp}.sqlite`;

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/x-sqlite3",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Failed to download backup" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
