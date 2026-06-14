import { getTransactionHistory } from "@/actions/report.actions";
import { getCategories } from "@/actions/category.actions";
import { HistoryClient } from "@/components/history/HistoryClient";

export const metadata = {
  title: "Riwayat Transaksi",
};

export default async function HistoryPage() {
  const [history, categories] = await Promise.all([
    getTransactionHistory(),
    getCategories(),
  ]);

  return (
    <div className="animate-fade-in">
      <HistoryClient initialHistory={history} categories={categories} />
    </div>
  );
}
