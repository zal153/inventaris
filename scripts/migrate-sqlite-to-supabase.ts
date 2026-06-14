import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import * as path from "path";
import * as fs from "fs";

// ── Path SQLite lama ─────────────────────────────────
const sqlitePaths = [
  path.join(process.cwd(), "prisma", "sqlite"),
  path.join(process.cwd(), "sqlite"),
  path.join(process.cwd(), "prisma", "dev.db"),
  path.join(process.cwd(), "dev.db"),
];

let sqlitePath: string | undefined;
for (const p of sqlitePaths) {
  if (fs.existsSync(p)) {
    sqlitePath = p;
    break;
  }
}

if (!sqlitePath) {
  console.error("❌ File SQLite tidak ditemukan! Coba path:", sqlitePaths);
  process.exit(1);
}

console.log(`📂 Membaca SQLite dari: ${sqlitePath}`);

const sqlite = new Database(sqlitePath, { readonly: true });
const prisma = new PrismaClient();

async function migrate() {
  console.log("\n🚀 Mulai migrasi data SQLite → Supabase (PostgreSQL)...\n");

  // ════════════════════════════════════════════════════
  // 1. BACA SEMUA DATA DARI SQLITE
  // ════════════════════════════════════════════════════
  const sqliteUsers = sqlite.prepare("SELECT * FROM User").all() as any[];
  const sqliteCategories = sqlite.prepare("SELECT * FROM Category").all() as any[];
  const sqliteProducts = sqlite.prepare("SELECT * FROM Product").all() as any[];
  const sqliteStockIns = sqlite.prepare("SELECT * FROM StockIn ORDER BY createdAt ASC").all() as any[];
  const sqliteStockOuts = sqlite.prepare("SELECT * FROM StockOut ORDER BY createdAt ASC").all() as any[];
  const sqliteLogs = sqlite.prepare("SELECT * FROM ActivityLog ORDER BY createdAt ASC").all() as any[];

  console.log("📋 Data ditemukan di SQLite:");
  console.log(`   Users       : ${sqliteUsers.length}`);
  console.log(`   Categories  : ${sqliteCategories.length}`);
  console.log(`   Products    : ${sqliteProducts.length}`);
  console.log(`   StockIn     : ${sqliteStockIns.length}`);
  console.log(`   StockOut    : ${sqliteStockOuts.length}`);
  console.log(`   ActivityLog : ${sqliteLogs.length}`);

  // ════════════════════════════════════════════════════
  // 2. PETA ID: SQLite ID → Supabase ID
  //    (karena seeding sudah buat data baru dengan ID beda)
  // ════════════════════════════════════════════════════
  // Map: sqliteUserId → supabaseUserId
  const userIdMap = new Map<string, string>();
  // Map: sqliteCategoryId → supabaseCategoryId
  const categoryIdMap = new Map<string, string>();
  // Map: sqliteProductId → supabaseProductId
  const productIdMap = new Map<string, string>();

  // ════════════════════════════════════════════════════
  // 3. MIGRASI USERS
  // ════════════════════════════════════════════════════
  console.log("\n[1/6] Migrasi Users...");
  let userCount = 0;
  for (const u of sqliteUsers) {
    // Cek apakah user sudah ada di Supabase berdasarkan email
    let existing = await prisma.user.findUnique({ where: { email: u.email } });
    
    if (existing) {
      // User sudah ada, update data, simpan mapping ID lama → ID Supabase
      await prisma.user.update({
        where: { email: u.email },
        data: {
          name: u.name,
          password: u.password,
          role: u.role,
          isActive: u.isActive === 1 || u.isActive === true,
        },
      });
      userIdMap.set(u.id, existing.id);
      console.log(`   📝 User "${u.email}" sudah ada, update & mapping: ${u.id} → ${existing.id}`);
    } else {
      // User belum ada, buat baru dengan ID asli dari SQLite
      existing = await prisma.user.create({
        data: {
          id: u.id,
          name: u.name,
          email: u.email,
          password: u.password,
          role: u.role,
          isActive: u.isActive === 1 || u.isActive === true,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
      userIdMap.set(u.id, u.id);
      console.log(`   ✅ User "${u.email}" dibuat baru`);
    }
    userCount++;
  }
  console.log(`   ✅ ${userCount} user selesai (ID mapping: ${userIdMap.size})`);

  // ════════════════════════════════════════════════════
  // 4. MIGRASI CATEGORIES
  // ════════════════════════════════════════════════════
  console.log("\n[2/6] Migrasi Categories...");
  let catCount = 0;
  let catNew = 0;
  for (const c of sqliteCategories) {
    let existing = await prisma.category.findUnique({ where: { name: c.name } });
    
    if (existing) {
      // Kategori sudah ada, mapping ID lama → ID Supabase
      categoryIdMap.set(c.id, existing.id);
      catCount++;
    } else {
      // Kategori belum ada di Supabase, buat baru
      existing = await prisma.category.create({
        data: {
          id: c.id,
          name: c.name,
          description: c.description,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
        },
      });
      categoryIdMap.set(c.id, c.id);
      catCount++;
      catNew++;
      console.log(`   ➕ Kategori "${c.name}" dibuat baru`);
    }
  }
  console.log(`   ✅ ${catCount} kategori selesai (${catNew} baru, mapping: ${categoryIdMap.size})`);

  // ════════════════════════════════════════════════════
  // 5. MIGRASI PRODUCTS
  // ════════════════════════════════════════════════════
  console.log("\n[3/6] Migrasi Products...");
  let prodCount = 0;
  let prodSkip = 0;
  let prodNew = 0;

  for (const p of sqliteProducts) {
    // Resolve categoryId ke Supabase categoryId
    const supabaseCategoryId = categoryIdMap.get(p.categoryId);
    
    if (!supabaseCategoryId) {
      console.warn(`   ⚠️ Lewati "${p.namaBarang}" — kategori ID ${p.categoryId} tidak ditemukan di mapping`);
      prodSkip++;
      continue;
    }

    try {
      let existing = await prisma.product.findUnique({ where: { kodeBarang: p.kodeBarang } });

      if (existing) {
        // Update data produk yang sudah ada
        await prisma.product.update({
          where: { kodeBarang: p.kodeBarang },
          data: {
            namaBarang: p.namaBarang,
            categoryId: supabaseCategoryId,
            satuan: p.satuan,
            hargaBeli: p.hargaBeli ?? 0,
            hargaJual: p.hargaJual ?? 0,
            stok: p.stok ?? 0,
            minimumStok: p.minimumStok ?? 5,
            stokIdeal: p.stokIdeal ?? 20,
            barcode: p.barcode,
            gambar: p.gambar,
            deskripsi: p.deskripsi,
            isActive: p.isActive === 1 || p.isActive === true,
          },
        });
        productIdMap.set(p.id, existing.id);
        prodCount++;
      } else {
        // Buat produk baru dengan ID asli SQLite
        existing = await prisma.product.create({
          data: {
            id: p.id,
            kodeBarang: p.kodeBarang,
            namaBarang: p.namaBarang,
            categoryId: supabaseCategoryId,
            satuan: p.satuan,
            hargaBeli: p.hargaBeli ?? 0,
            hargaJual: p.hargaJual ?? 0,
            stok: p.stok ?? 0,
            minimumStok: p.minimumStok ?? 5,
            stokIdeal: p.stokIdeal ?? 20,
            barcode: p.barcode,
            gambar: p.gambar,
            deskripsi: p.deskripsi,
            isActive: p.isActive === 1 || p.isActive === true,
            createdAt: new Date(p.createdAt),
            updatedAt: new Date(p.updatedAt),
          },
        });
        productIdMap.set(p.id, p.id);
        prodCount++;
        prodNew++;
      }
    } catch (e: any) {
      console.warn(`   ⚠️ Lewati produk "${p.namaBarang}" (${p.kodeBarang}): ${e.message?.split('\n')[0]}`);
      prodSkip++;
    }
  }
  console.log(`   ✅ ${prodCount} produk selesai (${prodNew} baru, ${prodSkip} dilewati)`);

  // ════════════════════════════════════════════════════
  // 6. MIGRASI STOCK IN
  // ════════════════════════════════════════════════════
  console.log("\n[4/6] Migrasi StockIn (Barang Masuk)...");
  let siCount = 0;
  let siSkip = 0;

  for (const s of sqliteStockIns) {
    const supabaseProductId = productIdMap.get(s.productId);
    const supabaseUserId = userIdMap.get(s.userId);

    if (!supabaseProductId) {
      console.warn(`   ⚠️ Lewati StockIn "${s.kodeTransaksi}" — productId tidak di-mapping`);
      siSkip++;
      continue;
    }
    if (!supabaseUserId) {
      console.warn(`   ⚠️ Lewati StockIn "${s.kodeTransaksi}" — userId tidak di-mapping`);
      siSkip++;
      continue;
    }

    try {
      const existing = await prisma.stockIn.findUnique({ where: { kodeTransaksi: s.kodeTransaksi } });
      if (!existing) {
        await prisma.stockIn.create({
          data: {
            id: s.id,
            kodeTransaksi: s.kodeTransaksi,
            productId: supabaseProductId,
            jumlah: s.jumlah,
            hargaBeli: s.hargaBeli ?? 0,
            tanggal: new Date(s.tanggal),
            catatan: s.catatan,
            userId: supabaseUserId,
            createdAt: new Date(s.createdAt),
          },
        });
        siCount++;
      } else {
        siSkip++;
      }
    } catch (e: any) {
      console.warn(`   ⚠️ Lewati StockIn "${s.kodeTransaksi}": ${e.message?.split('\n')[0]}`);
      siSkip++;
    }
  }
  console.log(`   ✅ ${siCount} barang masuk dimigrasi, ${siSkip} dilewati`);

  // ════════════════════════════════════════════════════
  // 7. MIGRASI STOCK OUT
  // ════════════════════════════════════════════════════
  console.log("\n[5/6] Migrasi StockOut (Barang Keluar)...");
  let soCount = 0;
  let soSkip = 0;

  for (const s of sqliteStockOuts) {
    const supabaseProductId = productIdMap.get(s.productId);
    const supabaseUserId = userIdMap.get(s.userId);

    if (!supabaseProductId) {
      console.warn(`   ⚠️ Lewati StockOut "${s.kodeTransaksi}" — productId tidak di-mapping`);
      soSkip++;
      continue;
    }
    if (!supabaseUserId) {
      console.warn(`   ⚠️ Lewati StockOut "${s.kodeTransaksi}" — userId tidak di-mapping`);
      soSkip++;
      continue;
    }

    try {
      const existing = await prisma.stockOut.findUnique({ where: { kodeTransaksi: s.kodeTransaksi } });
      if (!existing) {
        await prisma.stockOut.create({
          data: {
            id: s.id,
            kodeTransaksi: s.kodeTransaksi,
            productId: supabaseProductId,
            jumlah: s.jumlah,
            tujuan: s.tujuan,
            tanggal: new Date(s.tanggal),
            catatan: s.catatan,
            userId: supabaseUserId,
            createdAt: new Date(s.createdAt),
          },
        });
        soCount++;
      } else {
        soSkip++;
      }
    } catch (e: any) {
      console.warn(`   ⚠️ Lewati StockOut "${s.kodeTransaksi}": ${e.message?.split('\n')[0]}`);
      soSkip++;
    }
  }
  console.log(`   ✅ ${soCount} barang keluar dimigrasi, ${soSkip} dilewati`);

  // ════════════════════════════════════════════════════
  // 8. MIGRASI ACTIVITY LOG
  // ════════════════════════════════════════════════════
  console.log("\n[6/6] Migrasi ActivityLog...");
  let logCount = 0;
  let logSkip = 0;

  for (const l of sqliteLogs) {
    const supabaseUserId = userIdMap.get(l.userId);

    if (!supabaseUserId) {
      logSkip++;
      continue;
    }

    try {
      const existing = await prisma.activityLog.findUnique({ where: { id: l.id } });
      if (!existing) {
        await prisma.activityLog.create({
          data: {
            id: l.id,
            userId: supabaseUserId,
            action: l.action,
            tableName: l.tableName,
            description: l.description,
            createdAt: new Date(l.createdAt),
          },
        });
        logCount++;
      } else {
        logSkip++;
      }
    } catch (e: any) {
      logSkip++;
    }
  }
  console.log(`   ✅ ${logCount} log aktivitas dimigrasi, ${logSkip} dilewati`);

  // ════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(52));
  console.log("✅ MIGRASI SELESAI!");
  console.log("═".repeat(52));
  console.log(`   👤 Users       : ${userCount}`);
  console.log(`   📦 Categories  : ${catCount}`);
  console.log(`   🏷️  Products    : ${prodCount} (lewati: ${prodSkip})`);
  console.log(`   📥 Stock In    : ${siCount} (lewati: ${siSkip})`);
  console.log(`   📤 Stock Out   : ${soCount} (lewati: ${soSkip})`);
  console.log(`   📝 Activity Log: ${logCount} (lewati: ${logSkip})`);
  console.log("\n🎉 Semua data SQLite sudah berhasil dipindahkan ke Supabase!");
}

migrate()
  .catch((e) => {
    console.error("\n❌ Error saat migrasi:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
