import { getStockOuts } from "@/actions/stock-out.actions";
import { StockOutListClient } from "@/components/stock/StockOutListClient";

export const metadata = {
  title: "Barang Keluar",
};

export default async function StockOutPage() {
  const stockOuts = await getStockOuts();

  return (
    <div className="animate-fade-in">
      <StockOutListClient stockOuts={stockOuts} />
    </div>
  );
}
