import prisma from "@/lib/prisma";
import { getProductById } from "@/actions/product.actions";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatRupiah, formatDate, getStockStatus } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Package,
  Calendar,
  Layers,
  ShoppingBag,
  Tag,
  Info,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";


interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductById(id);
  return {
    title: product ? `Detail: ${product.namaBarang}` : "Detail Produk",
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = await params;

  // Fetch product with category
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      category: true,
    },
  });

  if (!product) {
    notFound();
  }

  // Fetch recent stock actions (In and Out) for this product
  const [stockIns, stockOuts] = await Promise.all([
    prisma.stockIn.findMany({
      where: { productId: id },
      include: { user: { select: { name: true } } },
      orderBy: { tanggal: "desc" },
      take: 5,
    }),
    prisma.stockOut.findMany({
      where: { productId: id },
      include: { user: { select: { name: true } } },
      orderBy: { tanggal: "desc" },
      take: 5,
    }),
  ]);

  // Combined and sorted transactions
  const transactions = [
    ...stockIns.map((item) => ({
      id: item.id,
      code: item.kodeTransaksi,
      type: "MASUK" as const,
      qty: item.jumlah,
      date: item.tanggal,
      user: item.user.name,
      party: "-",
      notes: item.catatan,
    })),
    ...stockOuts.map((item) => ({
      id: item.id,
      code: item.kodeTransaksi,
      type: "KELUAR" as const,
      qty: item.jumlah,
      date: item.tanggal,
      user: item.user.name,
      party: item.tujuan || "Toko / Penjualan",
      notes: item.catatan,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculations
  const stockStatus = getStockStatus(product.stok, product.minimumStok);


  let statusClass = "bg-success/10 text-success border-success/20";
  if (stockStatus.color === "warning") {
    statusClass = "bg-warning/10 text-warning border-warning/20";
  } else if (stockStatus.color === "danger") {
    statusClass = "bg-destructive/10 text-destructive border-destructive/20";
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card text-foreground hover:bg-muted/30 transition shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader
          title={product.namaBarang}
          description={`Kode Barang: ${product.kodeBarang}`}
          action={
            <Link
              href={`/products/${product.id}/edit`}
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Produk</span>
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Photo & Quick Status Card */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm overflow-hidden flex flex-col items-center justify-center text-center">
            <div className="relative h-48 w-48 rounded-xl border border-border bg-muted/20 overflow-hidden flex items-center justify-center mb-4 shadow-inner">
              {product.gambar ? (
                <img src={product.gambar} alt={product.namaBarang} className="h-full w-full object-cover" />
              ) : (
                <Package className="h-16 w-16 text-muted-foreground/30" />
              )}
            </div>
            <h3 className="font-semibold text-lg text-foreground">{product.namaBarang}</h3>
            <span className="font-mono text-sm text-muted-foreground mt-0.5">{product.kodeBarang}</span>
            
            <div className="mt-4 w-full border-t border-border pt-4 flex justify-around">
              <div>
                <p className="text-xs text-muted-foreground">Kategori</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{product.category.name}</p>
              </div>
              <div className="border-l border-border h-8 my-auto" />
              <div>
                <p className="text-xs text-muted-foreground">Satuan</p>
                <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">{product.satuan}</p>
              </div>
            </div>
          </div>

          {/* Stock Metrics Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground tracking-wider uppercase flex items-center gap-2">
              <Layers className="h-4 w-4" /> Status Persediaan
            </h4>
            
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/20 border border-border p-2.5 rounded-xl text-center animate-pulse-subtle">
                <p className="text-[10px] text-muted-foreground">Stok Saat Ini</p>
                <p className="text-lg font-bold text-foreground mt-1">{product.stok}</p>
              </div>
              <div className="bg-muted/20 border border-border p-2.5 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground">Min. Stok</p>
                <p className="text-lg font-bold text-foreground mt-1">{product.minimumStok}</p>
              </div>
              <div className="bg-muted/20 border border-border p-2.5 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground">Stok Ideal</p>
                <p className="text-lg font-bold text-foreground mt-1">{product.stokIdeal}</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="text-muted-foreground">Status Stok</span>
              <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold border ${statusClass}`}>
                {stockStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Details & History */}
        <div className="lg:col-span-2 space-y-6">


          {/* Product Description */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h4 className="font-semibold text-sm text-muted-foreground tracking-wider uppercase mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" /> Deskripsi Tambahan
            </h4>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.deskripsi || "Tidak ada deskripsi tambahan untuk produk ini."}
            </p>
          </div>

          {/* Recent Transact History */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h4 className="font-semibold text-sm text-muted-foreground tracking-wider uppercase mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Riwayat Mutasi Stok Terbaru (Maks 10)
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
                    <th className="p-3">Kode Transaksi</th>
                    <th className="p-3">Jenis</th>
                    <th className="p-3">Jumlah</th>
                    <th className="p-3">Tujuan</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.length > 0 ? (
                    transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/10 transition-colors">
                        <td className="p-3 font-mono font-semibold text-foreground">{t.code}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                              t.type === "MASUK"
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-warning/10 text-warning border-warning/20"
                            }`}
                          >
                            {t.type === "MASUK" ? (
                              <ArrowDownCircle className="h-3 w-3" />
                            ) : (
                              <ArrowUpCircle className="h-3 w-3" />
                            )}
                            {t.type}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-foreground">{t.qty}</td>
                        <td className="p-3 text-muted-foreground">{t.party}</td>
                        <td className="p-3 text-muted-foreground">{formatDate(t.date)}</td>
                        <td className="p-3 text-muted-foreground">{t.user}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        Belum ada mutasi stok untuk produk ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
