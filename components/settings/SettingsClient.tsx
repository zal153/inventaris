"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Database,
  Download,
  Upload,
  Info,
  Server,
  Package,
  Tags,
  Users,
  Activity,
  Loader2,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface SystemInfoProps {
  dbLocation: string;
  totalProducts: number;
  totalCategories: number;
  totalUsers: number;
  totalStockIns: number;
  totalStockOuts: number;
  totalLogs: number;
  nodeVersion: string;
  platform: string;
}

interface SettingsClientProps {
  info: SystemInfoProps | null;
}

export function SettingsClient({ info }: SettingsClientProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);

  // Backup database file
  const handleBackup = async () => {
    toast.info("Menyiapkan unduhan backup database...");
    try {
      window.location.href = "/api/backup";
      toast.success("Backup database berhasil diunduh");
    } catch (err) {
      toast.error("Gagal mengunduh backup database");
    }
  };

  // Select restore file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirmRestore(true);
    }
  };

  // Perform restore fetch to API
  const handleRestore = async () => {
    if (!selectedFile) return;
    setIsRestoring(true);
    setShowConfirmRestore(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Database berhasil dipulihkan dari file backup!");
        router.refresh();
        // Wait 1.5s and reload page to reset context
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(data.error || "Gagal memulihkan database");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan koneksi saat memulihkan database");
    } finally {
      setIsRestoring(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        description="Pantau spesifikasi server lokal, lakukan backup data, serta atur pemulihan database."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Cloud Database Info */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground tracking-wider uppercase flex items-center gap-2 pb-2 border-b border-border">
              <Cloud className="h-4 w-4 text-sky-500" /> Infrastruktur Database
            </h4>

            <div className="space-y-3">
              <p className="text-xs text-foreground leading-relaxed font-semibold">
                Status Koneksi: <span className="text-emerald-500 font-bold">Terhubung ke Cloud</span>
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Sistem inventaris StockSync saat ini menggunakan database **Supabase PostgreSQL (Cloud)** yang terletak di wilayah **Singapura (ap-southeast-1)**.
              </p>
              <div className="border-t border-border/60 pt-4 space-y-2">
                <p className="font-semibold text-xs text-muted-foreground">Pencadangan Otomatis:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Pencadangan (*backup*) dan pemulihan (*restore*) seluruh data transaksi serta inventaris dikelola secara otomatis setiap hari oleh platform cloud Supabase. Pemeliharaan database secara manual/lokal tidak diperlukan lagi.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: System Info Cards */}
        {info && (
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Metrics Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground tracking-wider uppercase flex items-center gap-2 pb-2 border-b border-border">
                <Info className="h-4 w-4" /> Statistik Record Data
              </h4>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Total Produk
                  </p>
                  <p className="font-bold text-lg text-foreground">{info.totalProducts}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Tags className="h-3.5 w-3.5" /> Kategori
                  </p>
                  <p className="font-bold text-lg text-foreground">{info.totalCategories}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Pengguna
                  </p>
                  <p className="font-bold text-lg text-foreground">{info.totalUsers}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Barang Masuk
                  </p>
                  <p className="font-bold text-lg text-foreground">{info.totalStockIns}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Barang Keluar
                  </p>
                  <p className="font-bold text-lg text-foreground">{info.totalStockOuts}</p>
                </div>
              </div>
            </div>

            {/* Local Server Specs Card */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground tracking-wider uppercase flex items-center gap-2 pb-2 border-b border-border">
                <Server className="h-4 w-4" /> Lingkungan Localhost
              </h4>

              <div className="space-y-3.5 text-xs text-muted-foreground">
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span>Lokasi Database:</span>
                  <span className="font-semibold text-foreground">{info.dbLocation}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span>Versi Node.js:</span>
                  <span className="font-semibold text-foreground">{info.nodeVersion}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/40 pb-2">
                  <span>Sistem Operasi Host:</span>
                  <span className="font-semibold text-foreground capitalize">{info.platform}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span>Total Log Aktivitas:</span>
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-muted-foreground" /> {info.totalLogs} baris
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Restore Dialog */}
      <ConfirmDialog
        isOpen={showConfirmRestore}
        onClose={() => {
          setShowConfirmRestore(false);
          setSelectedFile(null);
        }}
        onConfirm={handleRestore}
        title="Konfirmasi Restore Database?"
        description={`PENTING! Memulihkan database dari file backup "${selectedFile?.name}" akan menimpa dan menghapus total seluruh data transaksi, stok barang, kategori, dan akun pengguna saat ini. Tindakan ini TIDAK dapat dibatalkan.`}
        confirmLabel="Ya, Timpa Data"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isRestoring}
      />
    </div>
  );
}
