import { getProducts } from "@/actions/product.actions";
import { StockInForm } from "@/components/stock/StockInForm";
import { PageHeader } from "@/components/shared/PageHeader";

export const metadata = {
  title: "Catat Barang Masuk",
};

export default async function NewStockInPage() {
  const products = await getProducts();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Catat Barang Masuk"
        description="Mencatat data transaksi masuknya barang dagang baru ke gudang persediaan."
      />
      <div className="w-full">
        <StockInForm products={products as any} />
      </div>
    </div>
  );
}
