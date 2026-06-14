import { getStockIns } from "@/actions/stock-in.actions";
import { StockInListClient } from "@/components/stock/StockInListClient";

export const metadata = {
  title: "Barang Masuk",
};

export default async function StockInPage() {
  const stockIns = await getStockIns();

  return (
    <div className="animate-fade-in">
      <StockInListClient stockIns={stockIns} />
    </div>
  );
}
