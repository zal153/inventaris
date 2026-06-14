"use client";

import {
  Package,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardStats } from "@/types";

interface StatsCardsProps {
  stats: DashboardStats;
}

const statItems = [
  {
    key: "totalProducts" as const,
    label: "Total Barang",
    icon: Package,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/10 hover:border-primary/30",
  },
  {
    key: "totalCategories" as const,
    label: "Total Kategori",
    icon: Tags,
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-600/10 dark:bg-violet-400/20",
    borderColor: "border-violet-500/10 hover:border-violet-500/30 dark:border-violet-400/20",
  },
  {
    key: "stockInToday" as const,
    label: "Masuk Hari Ini",
    icon: ArrowDownToLine,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/10 hover:border-success/30",
  },
  {
    key: "stockOutToday" as const,
    label: "Keluar Hari Ini",
    icon: ArrowUpFromLine,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-600/10 dark:bg-orange-400/20",
    borderColor: "border-orange-500/10 hover:border-orange-500/30 dark:border-orange-400/20",
  },
  {
    key: "lowStockCount" as const,
    label: "Stok Menipis",
    icon: AlertTriangle,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/10 hover:border-warning/30",
  },
  {
    key: "outOfStockCount" as const,
    label: "Stok Habis",
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/10 hover:border-destructive/30",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        const value = stats[item.key];
        return (
          <div
            key={item.key}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-fade-in",
              item.borderColor,
              `stagger-${index + 1}`
            )}
            style={{ opacity: 0 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1.5 text-2xl font-bold text-card-foreground">
                  {value}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
                  item.bgColor
                )}
              >
                <Icon className={cn("h-4.5 w-4.5", item.color)} />
              </div>
            </div>

            {/* Subtle decorative gradient */}
            <div
              className={cn(
                "absolute -bottom-2 -right-2 h-16 w-16 rounded-full opacity-10 blur-xl transition-opacity group-hover:opacity-20",
                item.bgColor
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
