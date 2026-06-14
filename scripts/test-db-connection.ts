import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Mencoba koneksi ke Supabase PostgreSQL...");
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });
    console.log("Koneksi Sukses!");
    console.log("Daftar user di Supabase:", users);

    const productCount = await prisma.product.count();
    console.log("Jumlah produk:", productCount);
  } catch (err) {
    console.error("Koneksi Gagal:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
