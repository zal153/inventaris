"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  Database,
  Moon,
  Sun,
  X,
  Activity,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Master Barang",
    href: "/products",
    icon: Package,
  },
  {
    title: "Kategori",
    href: "/categories",
    icon: Tags,
  },
  {
    title: "Barang Masuk",
    href: "/stock-in",
    icon: ArrowDownToLine,
  },
  {
    title: "Barang Keluar",
    href: "/stock-out",
    icon: ArrowUpFromLine,
  },
  {
    title: "Riwayat Transaksi",
    href: "/history",
    icon: ClipboardList,
  },
  {
    title: "Laporan",
    href: "/reports",
    icon: FileText,
  },
];

const settingItems = [
  {
    title: "Pengaturan Sistem",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Manajemen User",
    href: "/settings/users",
    icon: Users,
  },
  {
    title: "Log Aktivitas",
    href: "/settings/activity",
    icon: Activity,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("stocksync-theme");
    setDarkMode(stored === "dark");
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem("stocksync-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[68px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Collapse button - floating on the edge (desktop only) */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-5 z-50 h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground hover:text-foreground shadow-sm hover:scale-105 transition-all"
        >
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </button>

        {/* Logo */}
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
        >
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2.5 animate-fade-in" onClick={onMobileClose}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Package className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-foreground">
                  StockSync
                </span>
                <span className="text-[10px] font-medium text-muted-foreground -mt-0.5">
                  Offline
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/dashboard" className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Package className="h-4.5 w-4.5" />
            </Link>
          )}

          {/* Close button - mobile only */}
          {!collapsed && (
            <button
              onClick={onMobileClose}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-1">
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Menu Utama
              </p>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && <span>{item.title}</span>}
                  {active && !collapsed && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Settings Section */}
          <div className="mt-6 space-y-1">
            {!collapsed && (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Pengaturan
              </p>
            )}
            {settingItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {!collapsed && <span>{item.title}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3 space-y-1">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? (darkMode ? "Light Mode" : "Dark Mode") : undefined}
          >
            {darkMode ? (
              <Sun className="h-[18px] w-[18px] shrink-0 text-yellow-500" />
            ) : (
              <Moon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            )}
            {!collapsed && <span>{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>

          {/* Logout */}
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? "Logout" : undefined}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>Logout</span>}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
