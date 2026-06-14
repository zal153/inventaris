import { PrismaClient } from "@prisma/client";

// Seed data for StockSync Offline
// Run: pnpm db:seed

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Admin User ──────────────────────────────────────
  // Password: admin123 (bcrypt hashed)
  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      name: "Administrator",
      email: "admin@gmail.com",
      password: "$2b$10$QFqArHGQSp7A6dfvmjR6ZuSO0dKuiQN/riXn21ztEetglwmcAx6OG",
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin user created: ${admin.email}`);

  // ── Categories ──────────────────────────────────────
  const categories = [
    { name: "Makanan", description: "Produk makanan dan snack" },
    { name: "Minuman", description: "Produk minuman" },
    { name: "Elektronik", description: "Perangkat dan aksesoris elektronik" },
    { name: "ATK", description: "Alat tulis kantor" },
    { name: "Kebersihan", description: "Produk kebersihan dan perawatan" },
    { name: "Lain-lain", description: "Produk lainnya" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ ${categories.length} categories created`);

  // ── Get category IDs ────────────────────────────────
  const catMakanan = await prisma.category.findUnique({ where: { name: "Makanan" } });
  const catMinuman = await prisma.category.findUnique({ where: { name: "Minuman" } });
  const catElektronik = await prisma.category.findUnique({ where: { name: "Elektronik" } });
  const catATK = await prisma.category.findUnique({ where: { name: "ATK" } });
  const catKebersihan = await prisma.category.findUnique({ where: { name: "Kebersihan" } });

  // ── Products ────────────────────────────────────────
  const products = [
    {
      kodeBarang: "MKN-001",
      namaBarang: "Indomie Goreng",
      categoryId: catMakanan!.id,
      satuan: "pcs",
      hargaBeli: 2800,
      hargaJual: 3500,
      stok: 150,
      minimumStok: 20,
      deskripsi: "Mi instan goreng original",
    },
    {
      kodeBarang: "MKN-002",
      namaBarang: "Indomie Kuah Soto",
      categoryId: catMakanan!.id,
      satuan: "pcs",
      hargaBeli: 2800,
      hargaJual: 3500,
      stok: 80,
      minimumStok: 20,
      deskripsi: "Mi instan kuah rasa soto",
    },
    {
      kodeBarang: "MNM-001",
      namaBarang: "Aqua 600ml",
      categoryId: catMinuman!.id,
      satuan: "botol",
      hargaBeli: 3000,
      hargaJual: 4000,
      stok: 5,
      minimumStok: 10,
      deskripsi: "Air mineral 600ml",
    },
    {
      kodeBarang: "MNM-002",
      namaBarang: "Teh Botol Sosro 450ml",
      categoryId: catMinuman!.id,
      satuan: "botol",
      hargaBeli: 3500,
      hargaJual: 5000,
      stok: 3,
      minimumStok: 10,
      deskripsi: "Teh manis dalam botol",
    },
    {
      kodeBarang: "ELK-001",
      namaBarang: "Kabel USB Type-C 1m",
      categoryId: catElektronik!.id,
      satuan: "pcs",
      hargaBeli: 15000,
      hargaJual: 25000,
      stok: 30,
      minimumStok: 5,
      deskripsi: "Kabel charger USB-C 1 meter",
    },
    {
      kodeBarang: "ELK-002",
      namaBarang: "Mouse Wireless Logitech",
      categoryId: catElektronik!.id,
      satuan: "pcs",
      hargaBeli: 85000,
      hargaJual: 120000,
      stok: 12,
      minimumStok: 3,
      deskripsi: "Mouse wireless Logitech M185",
    },
    {
      kodeBarang: "ATK-001",
      namaBarang: "Pulpen Pilot G-2",
      categoryId: catATK!.id,
      satuan: "pcs",
      hargaBeli: 12000,
      hargaJual: 18000,
      stok: 0,
      minimumStok: 10,
      deskripsi: "Pulpen gel 0.5mm",
    },
    {
      kodeBarang: "ATK-002",
      namaBarang: "Buku Tulis Sinar Dunia A5",
      categoryId: catATK!.id,
      satuan: "pcs",
      hargaBeli: 4000,
      hargaJual: 6000,
      stok: 45,
      minimumStok: 10,
      deskripsi: "Buku tulis 40 lembar",
    },
    {
      kodeBarang: "KBR-001",
      namaBarang: "Sabun Lifebuoy 100g",
      categoryId: catKebersihan!.id,
      satuan: "pcs",
      hargaBeli: 3500,
      hargaJual: 5500,
      stok: 60,
      minimumStok: 15,
      deskripsi: "Sabun mandi batangan",
    },
    {
      kodeBarang: "KBR-002",
      namaBarang: "Rinso Anti Noda 800g",
      categoryId: catKebersihan!.id,
      satuan: "pcs",
      hargaBeli: 18000,
      hargaJual: 24000,
      stok: 8,
      minimumStok: 5,
      deskripsi: "Deterjen bubuk 800 gram",
    },
  ];

  for (const prod of products) {
    await prisma.product.create({ data: prod });
  }
  console.log(`✅ ${products.length} products created`);

  // ── Sample Stock In Transactions ────────────────────
  const allProducts = await prisma.product.findMany();
  const today = new Date();

  for (let i = 0; i < 5; i++) {
    const prod = allProducts[i];
    await prisma.stockIn.create({
      data: {
        kodeTransaksi: `BM-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`,
        productId: prod.id,
        jumlah: Math.floor(Math.random() * 20) + 10,
        hargaBeli: prod.hargaBeli,
        tanggal: today,
        catatan: "Stok awal",
        userId: admin.id,
      },
    });
  }
  console.log("✅ 5 sample stock-in transactions created");

  // ── Sample Stock Out Transactions ───────────────────
  for (let i = 0; i < 3; i++) {
    const prod = allProducts[i];
    await prisma.stockOut.create({
      data: {
        kodeTransaksi: `BK-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`,
        productId: prod.id,
        jumlah: Math.floor(Math.random() * 5) + 1,
        tujuan: "Penjualan",
        tanggal: today,
        catatan: "Penjualan harian",
        userId: admin.id,
      },
    });
  }
  console.log("✅ 3 sample stock-out transactions created");

  // ── Activity Logs ───────────────────────────────────
  await prisma.activityLog.create({
    data: {
      userId: admin.id,
      action: "LOGIN",
      tableName: "users",
      description: "Admin melakukan login pertama kali",
    },
  });
  console.log("✅ Sample activity log created");

  console.log("\n🎉 Database seeded successfully!");
  console.log("   📧 Login: admin@gmail.com");
  console.log("   🔑 Password: 12345678");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
