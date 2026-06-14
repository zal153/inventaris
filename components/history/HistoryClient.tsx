"use client";

import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate, formatRupiah } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/export";
import type { TransactionHistory } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { FileDown, FileSpreadsheet, ArrowDownCircle, ArrowUpCircle, Filter } from "lucide-react";
import { toast } from "sonner";

interface HistoryClientProps {
  initialHistory: TransactionHistory[];
  categories: { id: string; name: string }[];
}

export function HistoryClient({ initialHistory, categories }: HistoryClientProps) {
  const [filterType, setFilterType] = useState<"all" | "MASUK" | "KELUAR">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Client side filtering for maximum performance offline
  const filteredHistory = initialHistory.filter((item) => {
    // 1. Filter Type
    if (filterType !== "all" && item.type !== filterType) return false;

    // 2. Date Range
    const itemDate = new Date(item.tanggal);
    itemDate.setHours(0, 0, 0, 0);

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (itemDate < start) return false;
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      if (itemDate > end) return false;
    }

    return true;
  });

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredHistory.map((item) => ({
      "Kode Transaksi": item.kodeTransaksi,
      Jenis: item.type === "MASUK" ? "Barang Masuk" : "Barang Keluar",
      Barang: item.namaBarang,
      Kode: item.kodeBarang,
      Jumlah: item.jumlah,
      Satuan: item.satuan,
      "Tujuan / Supplier": item.tujuan || "-",
      Tanggal: formatDate(item.tanggal),
      Petugas: item.userName,
      Catatan: item.catatan || "",
    }));
    exportToExcel(data, "Laporan_Riwayat_Transaksi");
    toast.success("Excel riwayat transaksi berhasil diexport");
  };

  // Export to PDF
  const handleExportPDF = () => {
    const headers = [
      "Kode Trans.",
      "Jenis",
      "Barang",
      "Qty",
      "Penerima / Supplier",
      "Tanggal",
      "Petugas",
    ];
    const rows = filteredHistory.map((item) => [
      item.kodeTransaksi,
      item.type,
      item.namaBarang,
      `${item.jumlah} ${item.satuan}`,
      item.type === "MASUK" ? "-" : item.tujuan || "Toko",
      formatDate(item.tanggal),
      item.userName,
    ]);
    exportToPDF("Laporan Riwayat Mutasi Barang", headers, rows, "Laporan_Riwayat_Transaksi");
    toast.success("PDF riwayat transaksi berhasil diexport");
  };

  const columns: ColumnDef<TransactionHistory>[] = [
    {
      accessorKey: "kodeTransaksi",
      header: "Kode Transaksi",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-foreground">
          {row.original.kodeTransaksi}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Jenis",
      cell: ({ row }) => {
        const isMasuk = row.original.type === "MASUK";
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-semibold border ${
              isMasuk
                ? "bg-success/10 text-success border-success/20"
                : "bg-warning/10 text-warning border-warning/20"
            }`}
          >
            {isMasuk ? (
              <ArrowDownCircle className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpCircle className="h-3.5 w-3.5" />
            )}
            {row.original.type}
          </span>
        );
      },
    },
    {
      accessorKey: "namaBarang",
      header: "Barang",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{row.original.namaBarang}</p>
          <span className="text-[10px] text-muted-foreground font-mono">
            {row.original.kodeBarang}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "jumlah",
      header: "Jumlah",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {row.original.jumlah}{" "}
          <span className="text-muted-foreground text-[10px] font-normal">
            {row.original.satuan}
          </span>
        </span>
      ),
    },
    {
      header: "Supplier / Tujuan",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span className="text-muted-foreground">
            {item.type === "MASUK" ? "Dari Supplier" : item.tujuan || "Toko / Penjualan"}
          </span>
        );
      },
    },
    {
      accessorKey: "tanggal",
      header: "Tanggal Transaksi",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.tanggal)}</span>,
    },
    {
      accessorKey: "userName",
      header: "Petugas",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.userName}</span>,
    },
  ];

  const filterComponent = (
    <div className="flex flex-wrap items-center gap-2">
      {/* Type Filter Tabs */}
      <div className="flex items-center border border-border bg-card rounded-lg p-0.5 text-xs font-semibold select-none">
        <button
          onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 rounded-md transition ${
            filterType === "all" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterType("MASUK")}
          className={`px-3 py-1.5 rounded-md transition ${
            filterType === "MASUK" ? "bg-success/15 text-success" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Masuk
        </button>
        <button
          onClick={() => setFilterType("KELUAR")}
          className={`px-3 py-1.5 rounded-md transition ${
            filterType === "KELUAR" ? "bg-warning/15 text-warning" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Keluar
        </button>
      </div>

      {/* Date Filters */}
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2 py-1.5 text-xs">
        <span className="text-muted-foreground">Dari:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-transparent border-0 text-foreground font-semibold outline-none py-0.5"
        />
      </div>
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2 py-1.5 text-xs">
        <span className="text-muted-foreground">Sampai:</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-transparent border-0 text-foreground font-semibold outline-none py-0.5"
        />
      </div>

      {(filterType !== "all" || startDate || endDate) && (
        <button
          onClick={() => {
            setFilterType("all");
            setStartDate("");
            setEndDate("");
          }}
          className="text-xs text-destructive font-semibold hover:underline"
        >
          Reset Filter
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Transaksi"
        description="Pantau audit log mutasi keluar masuk seluruh persediaan stok barang gudang."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-card border border-border text-foreground hover:bg-muted/30 px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-card border border-border text-foreground hover:bg-muted/30 px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <FileDown className="h-4 w-4 text-destructive" />
              <span>Export PDF</span>
            </button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={filteredHistory}
        searchKey="namaBarang"
        searchPlaceholder="Cari berdasarkan nama atau kode barang..."
        filterComponent={filterComponent}
      />
    </div>
  );
}
