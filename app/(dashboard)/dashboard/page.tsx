import {
  getDashboardStats,
  getLowStockProducts,
  getMonthlyStockData,
} from "@/actions/dashboard.actions";
import { StatsCards } from "./StatsCards";
import { StockChart } from "./StockChart";
import { LowStockWidget } from "./LowStockWidget";
import { QuickActions } from "./QuickActions";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [stats, lowStockProducts, monthlyData] = await Promise.all([
    getDashboardStats(),
    getLowStockProducts(),
    getMonthlyStockData(),
  ]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Quick Actions */}
      <QuickActions />

      {/* Charts & Widgets */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <StockChart data={monthlyData} />
        </div>
        <div>
          <LowStockWidget products={lowStockProducts} />
        </div>
      </div>
    </div>
  );
}
