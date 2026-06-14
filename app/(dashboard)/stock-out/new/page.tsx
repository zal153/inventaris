import { getProducts } from "@/actions/product.actions";
import { StockOutForm } from "@/components/stock/StockOutForm";
import { PageHeader } from "@/components/shared/PageHeader";

export const metadata = {
  title: "Catat Barang Keluar",
};

export default async function NewStockOutPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Catat Barang Keluar"
        description="Mencatat data transaksi keluarnya barang dagang untuk toko, penjualan, atau retur."
      />
      <div className="w-full">
        <StockOutForm products={products as any} />
      </div>
    </div>
  );
}
