"use client";

import { useState } from "react";
import { getTransactionHistory, getStockReport, getLowStockReport } from "@/actions/report.actions";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatRupiah, formatDate, getStockStatus } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/export";
import {
  FileText,
  TrendingDown,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Play,
  FileSpreadsheet,
  FileDown,
  Printer,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface ReportsClientProps {
  categories: { id: string; name: string }[];
}

type ReportType = "stock" | "stock-in" | "stock-out" | "min-stock";

export function ReportsClient({ categories }: ReportsClientProps) {
  const [reportType, setReportType] = useState<ReportType>("stock");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);

  // Generate Report Preview
  const handleGeneratePreview = async () => {
    setIsLoading(true);
    try {
      const categoryId = selectedCategory === "all" ? undefined : selectedCategory;
      let data: any[] = [];

      if (reportType === "stock") {
        data = await getStockReport(categoryId);
      } else if (reportType === "min-stock") {
        data = await getLowStockReport(categoryId);
      } else {
        const filters = {
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          type: reportType === "stock-in" ? ("stock-in" as const) : ("stock-out" as const),
          categoryId,
        };
        data = await getTransactionHistory(filters);
      }

      setPreviewData(data);
      toast.success("Preview laporan berhasil digenerate");
    } catch (err) {
      toast.error("Gagal memuat preview laporan");
    } finally {
      setIsLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!previewData || previewData.length === 0) return;

    let exportData: any[] = [];
    let title = "Laporan";

    if (reportType === "stock" || reportType === "min-stock") {
      title = reportType === "stock" ? "Laporan_Stok_Barang" : "Laporan_Stok_Minimum";
      exportData = previewData.map((p) => {
        const base = {
          Kode: p.kodeBarang,
          Nama: p.namaBarang,
          Kategori: p.category.name,
          Stok: p.stok,
          Satuan: p.satuan,
        };
        if (reportType === "min-stock") {
          return {
            ...base,
            "Minimum Stok": p.minimumStok,
            "Stok Ideal": p.stokIdeal,
            "Rekomendasi Restock": Math.max(0, p.stokIdeal - p.stok),
          };
        }
        return base;
      });
    } else {
      title = reportType === "stock-in" ? "Laporan_Barang_Masuk" : "Laporan_Barang_Keluar";
      exportData = previewData.map((item) => ({
        "Kode Transaksi": item.kodeTransaksi,
        Barang: item.namaBarang,
        Kode: item.kodeBarang,
        Jumlah: item.jumlah,
        Satuan: item.satuan,
        Tanggal: formatDate(item.tanggal),
        Petugas: item.userName,
        Catatan: item.catatan || "",
      }));
    }

    exportToExcel(exportData, title);
    toast.success("Excel laporan berhasil diexport");
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!previewData || previewData.length === 0) return;

    let headers: string[] = [];
    let rows: any[][] = [];
    let title = "";

    const dateStr = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    if (reportType === "stock" || reportType === "min-stock") {
      title = reportType === "stock" ? `Stok (${dateStr})` : `Stok Minimum (${dateStr})`;
      if (reportType === "min-stock") {
        headers = ["No.", "Nama Barang", "Stok", "Satuan", "Rekomendasi Restock"];
        rows = previewData.map((p, index) => [
          (index + 1).toString(),
          p.namaBarang,
          p.stok.toString(),
          p.satuan,
          Math.max(0, p.stokIdeal - p.stok).toString(),
        ]);
      } else {
        headers = ["No.", "Nama Barang", "Stok", "Satuan"];
        rows = previewData.map((p, index) => [
          (index + 1).toString(),
          p.namaBarang,
          p.stok.toString(),
          p.satuan,
        ]);
      }
    } else {
      title = reportType === "stock-in" ? "Laporan Log Transaksi Barang Masuk" : "Laporan Log Transaksi Barang Keluar";
      headers = ["Kode Trans.", "Barang", "Qty", "Tanggal", "Petugas", "Catatan"];
      rows = previewData.map((item) => [
        item.kodeTransaksi,
        item.namaBarang,
        `${item.jumlah} ${item.satuan}`,
        formatDate(item.tanggal),
        item.userName,
        item.catatan || "-",
      ]);
    }

    exportToPDF(title, headers, rows, title.replace(/\s+/g, "_").replace(/[()]/g, ""));
    toast.success("PDF laporan berhasil diexport");
  };

  // Browser Print handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Laporan Manajemen Stok"
          description="Buat, preview, cetak, dan ekspor laporan berkala persediaan gudang Anda."
        />
      </div>

      {/* ── Report Type Chooser & Filter Toolbar ───────── */}
      <div className="no-print bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-foreground text-xs tracking-wide uppercase pb-2 border-b border-border">
          Parameter Filter Laporan
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
              Jenis Laporan
            </label>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value as ReportType);
                setPreviewData(null);
              }}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="stock">Laporan Stok Barang (Aktif)</option>
              <option value="min-stock">Laporan Stok Minimum (Peringatan)</option>
              <option value="stock-in">Laporan Barang Masuk (Riwayat)</option>
              <option value="stock-out">Laporan Barang Keluar (Riwayat)</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
              Filter Kategori
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Range (Conditional for logs) */}
          <div className={`${reportType === "stock" || reportType === "min-stock" ? "opacity-35 select-none pointer-events-none" : ""}`}>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={reportType === "stock" || reportType === "min-stock"}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className={`${reportType === "stock" || reportType === "min-stock" ? "opacity-35 select-none pointer-events-none" : ""}`}>
            <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
              Tanggal Selesai
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={reportType === "stock" || reportType === "min-stock"}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-border/60">
          <button
            onClick={handleGeneratePreview}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 py-2.5 rounded-lg text-sm shadow-sm transition disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span>Tampilkan Preview Laporan</span>
          </button>
        </div>
      </div>

      {/* ── Report Preview Area ─────────────────────────── */}
      {previewData && (
        <div className="space-y-4">
          <div className="no-print flex items-center justify-between">
            <h4 className="font-bold text-foreground text-sm tracking-wide uppercase">
              Preview Tabel Laporan ({previewData.length} baris)
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-card border border-border text-foreground hover:bg-muted/30 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak Browser</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 bg-card border border-border text-foreground hover:bg-muted/30 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 bg-card border border-border text-foreground hover:bg-muted/30 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition"
              >
                <FileDown className="h-3.5 w-3.5 text-destructive" />
                <span>Ekspor PDF</span>
              </button>
            </div>
          </div>

          {/* Printable Report Wrapper */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm print:border-0 print:shadow-none print:p-0">
            {/* Print Only Header */}
            <div className="hidden print:block text-center space-y-1 mb-6">
              <h2 className="text-xl font-bold">StockSync Offline Report</h2>
              <p className="text-xs text-muted-foreground">Sistem Informasi Manajemen Stok Barang</p>
              <div className="border-b border-border my-3" />
              <h3 className="font-semibold text-sm capitalize">
                {reportType === "stock" && "Laporan Stok Persediaan Barang"}
                {reportType === "min-stock" && "Laporan Peringatan Stok Minimum"}
                {reportType === "stock-in" && "Laporan Riwayat Pengiriman Barang Masuk"}
                {reportType === "stock-out" && "Laporan Riwayat Pengeluaran Barang Keluar"}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                Kategori: {selectedCategory === "all" ? "Semua Kategori" : categories.find((c) => c.id === selectedCategory)?.name}
                {(startDate || endDate) && ` | Periode: ${startDate || "Awal"} s/d ${endDate || "Akhir"}`}
              </p>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/20 text-muted-foreground font-bold print:bg-transparent">
                    {reportType === "stock" ? (
                      <>
                        <th className="p-3">Kode</th>
                        <th className="p-3">Nama Barang</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Stok</th>
                      </>
                    ) : reportType === "min-stock" ? (
                      <>
                        <th className="p-3">Kode</th>
                        <th className="p-3">Nama Barang</th>
                        <th className="p-3">Kategori</th>
                        <th className="p-3">Stok</th>
                        <th className="p-3">Min. Stok</th>
                        <th className="p-3">Stok Ideal</th>
                        <th className="p-3">Rekomendasi Restock</th>
                      </>
                    ) : (
                      <>
                        <th className="p-3">Kode Trans.</th>
                        <th className="p-3">Nama Barang</th>
                        <th className="p-3">Jenis</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Petugas</th>
                        <th className="p-3">Catatan</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.length > 0 ? (
                    previewData.map((row) => {
                      const id = row.id;
                      if (reportType === "stock") {
                        return (
                          <tr key={id} className="hover:bg-muted/10 print:hover:bg-transparent transition-colors">
                            <td className="p-3 font-mono font-semibold text-foreground">{row.kodeBarang}</td>
                            <td className="p-3 font-medium text-foreground">{row.namaBarang}</td>
                            <td className="p-3 text-muted-foreground">{row.category.name}</td>
                            <td className="p-3">
                              <span className="font-semibold text-foreground">{row.stok}</span>{" "}
                              <span className="text-muted-foreground text-[10px]">{row.satuan}</span>
                            </td>
                          </tr>
                        );
                      } else if (reportType === "min-stock") {
                        const restock = Math.max(0, row.stokIdeal - row.stok);
                        return (
                          <tr key={id} className="hover:bg-muted/10 print:hover:bg-transparent transition-colors">
                            <td className="p-3 font-mono font-semibold text-foreground">{row.kodeBarang}</td>
                            <td className="p-3 font-medium text-foreground">{row.namaBarang}</td>
                            <td className="p-3 text-muted-foreground">{row.category.name}</td>
                            <td className="p-3">
                              <span className="font-semibold text-foreground">{row.stok}</span>{" "}
                              <span className="text-muted-foreground text-[10px]">{row.satuan}</span>
                            </td>
                            <td className="p-3 text-muted-foreground font-medium">{row.minimumStok}</td>
                            <td className="p-3 text-muted-foreground font-medium">{row.stokIdeal}</td>
                            <td className="p-3">
                              <span className={`font-bold ${restock > 0 ? "text-primary" : "text-muted-foreground"}`}>
                                {restock}
                              </span>{" "}
                              <span className="text-muted-foreground text-[10px]">{row.satuan}</span>
                            </td>
                          </tr>
                        );
                      } else {
                        const isMasuk = row.type === "MASUK";
                        return (
                          <tr key={id} className="hover:bg-muted/10 print:hover:bg-transparent transition-colors">
                            <td className="p-3 font-mono font-semibold text-foreground">{row.kodeTransaksi}</td>
                            <td className="p-3 font-medium text-foreground">{row.namaBarang}</td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[9px] font-semibold border ${
                                  isMasuk
                                    ? "bg-success/10 text-success border-success/20"
                                    : "bg-warning/10 text-warning border-warning/20"
                                }`}
                              >
                                {row.type}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-semibold text-foreground">{row.jumlah}</span>{" "}
                              <span className="text-muted-foreground text-[10px]">{row.satuan}</span>
                            </td>
                            <td className="p-3 text-muted-foreground">{formatDate(row.tanggal)}</td>
                            <td className="p-3 text-muted-foreground">{row.userName}</td>
                            <td className="p-3 text-muted-foreground italic truncate max-w-[150px]">
                              {row.catatan || "—"}
                            </td>
                          </tr>
                        );
                      }
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Tidak ada data pencatatan dalam parameter filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Print Footer Details */}
            <div className="hidden print:flex justify-between items-center mt-12 text-[10px] text-muted-foreground">
              <span>Dicetak oleh petugas StockSync</span>
              <span>Ttd. Administrator</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
