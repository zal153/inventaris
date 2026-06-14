"use client";

import { useState } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatRupiah, formatDate } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/export";
import type { StockOutWithRelations } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import { FileDown, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { deleteStockOut } from "@/actions/stock-out.actions";

interface StockOutListClientProps {
  stockOuts: StockOutWithRelations[];
}

export function StockOutListClient({ stockOuts }: StockOutListClientProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filter stock-out transactions by date range
  const filteredStockOuts = stockOuts.filter((s) => {
    const itemDate = new Date(s.tanggal);
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
    const data = filteredStockOuts.map((s) => ({
      "Kode Transaksi": s.kodeTransaksi,
      Barang: s.product.namaBarang,
      Kode: s.product.kodeBarang,
      Tujuan: s.tujuan || "-",
      Jumlah: s.jumlah,
      Satuan: s.product.satuan,
      Tanggal: formatDate(s.tanggal),
      Petugas: s.user.name,
      Catatan: s.catatan || "",
    }));
    exportToExcel(data, "Laporan_Barang_Keluar");
    toast.success("Excel barang keluar berhasil diexport");
  };

  // Export to PDF
  const handleExportPDF = () => {
    const headers = [
      "Kode Trans.",
      "Barang",
      "Tujuan",
      "Qty",
      "Tanggal",
      "Petugas",
    ];
    const rows = filteredStockOuts.map((s) => [
      s.kodeTransaksi,
      s.product.namaBarang,
      s.tujuan || "-",
      `${s.jumlah} ${s.product.satuan}`,
      formatDate(s.tanggal),
      s.user.name,
    ]);
    exportToPDF("Laporan Riwayat Barang Keluar", headers, rows, "Laporan_Barang_Keluar");
    toast.success("PDF barang keluar berhasil diexport");
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await deleteStockOut(deleteId);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Terjadi kesalahan saat menghapus transaksi");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const columns: ColumnDef<StockOutWithRelations>[] = [
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
      accessorKey: "product.namaBarang",
      header: "Nama Barang",
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <p className="font-medium text-foreground">{row.original.product.namaBarang}</p>
          <span className="text-[10px] text-muted-foreground font-mono">
            {row.original.product.kodeBarang}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "tujuan",
      header: "Tujuan",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.tujuan || "—"}</span>
      ),
    },
    {
      accessorKey: "jumlah",
      header: "Jumlah",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">
          {row.original.jumlah}{" "}
          <span className="text-muted-foreground text-[10px] font-normal">
            {row.original.product.satuan}
          </span>
        </span>
      ),
    },
    {
      accessorKey: "tanggal",
      header: "Tanggal Keluar",
      cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.tanggal)}</span>,
    },
    {
      accessorKey: "user.name",
      header: "Petugas",
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.user.name}</span>,
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <button
          onClick={() => setDeleteId(row.original.id)}
          className="rounded-lg p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition flex items-center justify-center"
          title="Hapus Transaksi"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const filterComponent = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2 py-1.5 text-xs">
        <span className="text-muted-foreground font-medium">Dari:</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="bg-transparent border-0 text-foreground font-semibold outline-none py-0.5"
        />
      </div>
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2 py-1.5 text-xs">
        <span className="text-muted-foreground font-medium">Sampai:</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="bg-transparent border-0 text-foreground font-semibold outline-none py-0.5"
        />
      </div>
      {(startDate || endDate) && (
        <button
          onClick={() => {
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
        title="Barang Keluar"
        description="Mencatat dan memantau pengeluaran persediaan barang dagang untuk toko, penjualan, atau retur."
        action={
          <div className="flex flex-wrap items-center gap-2">
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
            <Link
              href="/stock-out/new"
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Catat Barang Keluar</span>
            </Link>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={filteredStockOuts}
        searchKey="product.namaBarang"
        searchPlaceholder="Cari berdasarkan nama barang..."
        filterComponent={filterComponent}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Transaksi Barang Keluar?"
        description="PENTING: Menghapus transaksi barang keluar ini akan mengembalikan stok barang terkait ke master gudang. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
