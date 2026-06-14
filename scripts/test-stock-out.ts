import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Mencoba membuat transaksi barang keluar tiruan...");
  try {
    const userId = "cmqdklbmn0000v60c85lb6yb2"; // Admin di Supabase
    
    // Cari produk Minyak Goreng
    const product = await prisma.product.findFirst({
      where: { namaBarang: { contains: "Minyak" } }
    });

    if (!product) {
      console.log("Produk Minyak Goreng tidak ditemukan di Supabase");
      return;
    }

    console.log("Produk ditemukan:", product.namaBarang, "ID:", product.id);

    // Jalankan transaksi tiruan
    const code = "BK-TEST-999";
    await prisma.$transaction(async (tx) => {
      await tx.stockOut.create({
        data: {
          kodeTransaksi: code,
          productId: product.id,
          jumlah: 1,
          tujuan: null, // Test tujuan null
          tanggal: new Date(),
          userId: userId,
        }
      });
      console.log("Insert StockOut berhasil!");

      // Cleanup
      await tx.stockOut.delete({
        where: { kodeTransaksi: code }
      });
      console.log("Cleanup berhasil!");
    });

    console.log("Seluruh tes database SUKSES!");
  } catch (err) {
    console.error("Tes Gagal dengan error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
