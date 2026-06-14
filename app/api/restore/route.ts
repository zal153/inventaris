import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Basic size limits e.g., max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds 20MB limit" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Verify it is a valid SQLite file header (first 15 bytes contain "SQLite format 3")
    const header = buffer.toString("utf8", 0, 15);
    if (!header.startsWith("SQLite format 3")) {
      return NextResponse.json({ error: "Invalid file format. File must be a valid SQLite database." }, { status: 400 });
    }

    const dbPath = path.join(process.cwd(), "prisma", "sqlite");

    // Disconnect connection to free database file lock before overwrite
    await prisma.$disconnect();

    // Overwrite database file
    await fs.writeFile(dbPath, buffer);

    // Write restoration audit log in the restored database
    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "UPDATE",
          tableName: "sqlite",
          description: `Melakukan pemulihan (restore) database dari file backup "${file.name}"`,
        },
      });
    } catch (dbErr) {
      console.warn("Could not write audit log in the restored database:", dbErr);
    }

    return NextResponse.json({ success: true, message: "Database restored successfully" });
  } catch (error) {
    console.error("Restore error:", error);
    return NextResponse.json({ error: "Failed to restore database" }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
