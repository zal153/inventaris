import { getCategories } from "@/actions/category.actions";
import { ReportsClient } from "@/components/reports/ReportsClient";

export const metadata = {
  title: "Laporan Manajemen Stok",
};

export default async function ReportsPage() {
  const categories = await getCategories();

  return (
    <div className="animate-fade-in">
      <ReportsClient categories={categories} />
    </div>
  );
}
