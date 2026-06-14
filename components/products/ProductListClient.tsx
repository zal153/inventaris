"use client";

import { useState, useTransition } from "react";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { deleteProduct, importProducts } from "@/actions/product.actions";
import { formatRupiah, getStockStatus } from "@/lib/utils";
import { exportToExcel, exportToPDF } from "@/lib/export";
import type { ProductWithRelations } from "@/types";
import { ColumnDef } from "@tanstack/react-table";
import {
  FileDown,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit,
  Eye,
  ImageIcon,
  Upload,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ProductListClientProps {
  products: ProductWithRelations[];
  categories: { id: string; name: string }[];
}

export function ProductListClient({ products, categories }: ProductListClientProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Filter products by category
  const filteredProducts = products.filter((p) => {
    if (selectedCategory === "all") return true;
    return p.category.id === selectedCategory;
  });

  // Handle delete confirmation
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await deleteProduct(deleteId);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Gagal menghapus produk");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredProducts.map((p) => ({
      Kode: p.kodeBarang,
      Nama: p.namaBarang,
      Kategori: p.category.name,
      Stok: p.stok,
      Satuan: p.satuan,
      "Min Stok": p.minimumStok,
      "Stok Ideal": p.stokIdeal,
      Deskripsi: p.deskripsi || "",
    }));
    exportToExcel(data, "Laporan_Master_Barang");
    toast.success("Excel berhasil diexport");
  };

  // Export to PDF
  const handleExportPDF = () => {
    const dateStr = new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date());

    const headers = [
      "No.",
      "Nama Barang",
      "Stok",
      "Satuan",
    ];
    const rows = filteredProducts.map((p, index) => [
      (index + 1).toString(),
      p.namaBarang,
      p.stok.toString(),
      p.satuan,
    ]);
    exportToPDF(`Stok (${dateStr})`, headers, rows, `Laporan_Stok_${dateStr.replace(/\s+/g, "_")}`);
    toast.success("PDF berhasil diexport");
  };


  // Import Excel handler
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Transform Excel format to expected format
        const items = rawData.map((row) => ({
          kodeBarang: String(row.Kode || row.kode || ""),
          namaBarang: String(row.Nama || row.nama || ""),
          kategori: String(row.Kategori || row.kategori || ""),
          satuan: String(row.Satuan || row.satuan || "pcs"),
          hargaBeli: 0,
          hargaJual: 0,
          stok: Number(row.Stok || row.stok || 0),
          minimumStok: Number(row["Min Stok"] || row.minimumStok || 5),
          stokIdeal: Number(row["Stok Ideal"] || row.stokIdeal || 20),
          deskripsi: row.Deskripsi || row.deskripsi || null,
        }));

        if (items.length === 0 || !items[0].kodeBarang || !items[0].namaBarang) {
          throw new Error("Format kolom Excel tidak sesuai template. Pastikan terdapat kolom Kode, Nama, Kategori, Stok, Satuan, Min Stok, Stok Ideal.");
        }


        const res = await importProducts(items);
        if (res.success) {
          toast.success(res.message);
          router.refresh();
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error(err.message || "Gagal mengimpor file Excel");
      } finally {
        setIsImporting(false);
        e.target.value = ""; // reset input
      }
    };
    reader.readAsBinaryString(file);
  };

  const columns: ColumnDef<ProductWithRelations>[] = [
    {
      accessorKey: "gambar",
      header: "Foto",
      cell: ({ row }) => {
        const url = row.original.gambar;
        return (
          <div className="h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/10 overflow-hidden flex">
            {url ? (
              <img src={url} alt="Produk" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "kodeBarang",
      header: "Kode",
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-foreground">
          {row.original.kodeBarang}
        </span>
      ),
    },
    {
      accessorKey: "namaBarang",
      header: "Nama Barang",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{row.original.namaBarang}</span>
      ),
    },
    {
      accessorKey: "category.name",
      header: "Kategori",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground border border-border">
          {row.original.category.name}
        </span>
      ),
    },
    {
      accessorKey: "stok",
      header: "Stok",
      cell: ({ row }) => {
        const { stok, satuan, minimumStok } = row.original;
        const status = getStockStatus(stok, minimumStok);
        return (
          <span className="font-medium">
            {stok} <span className="text-muted-foreground text-xs">{satuan}</span>
          </span>
        );
      },
    },

    {
      header: "Status",
      cell: ({ row }) => {
        const { stok, minimumStok } = row.original;
        const status = getStockStatus(stok, minimumStok);

        let badgeClass = "bg-success/10 text-success border-success/20";
        if (status.color === "warning") {
          badgeClass = "bg-warning/10 text-warning border-warning/20";
        } else if (status.color === "danger") {
          badgeClass = "bg-destructive/10 text-destructive border-destructive/20";
        }

        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold border ${badgeClass}`}
          >
            {status.label}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const id = row.original.id;
        return (
          <div className="flex items-center gap-1.5">
            <Link
              href={`/products/${id}`}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
              title="Detail"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <Link
              href={`/products/${id}/edit`}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition"
              title="Edit"
            >
              <Edit className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setDeleteId(id)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition"
              title="Hapus"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  // Category selection filter component
  const filterComponent = (
    <div className="flex items-center gap-2">
      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        <option value="all">Semua Kategori</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Master Barang"
        description="Kelola daftar persediaan barang dagang dan kategori produk."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Import Button */}
            <label className="flex items-center gap-1.5 cursor-pointer bg-card border border-border text-foreground hover:bg-muted/30 px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition">
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Impor Excel</span>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
                disabled={isImporting}
                className="hidden"
              />
            </label>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-card border border-border text-foreground hover:bg-muted/30 px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 bg-card border border-border text-foreground hover:bg-muted/30 px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition"
            >
              <FileDown className="h-4 w-4 text-destructive" />
              <span>Export PDF</span>
            </button>

            {/* Add Product Link */}
            <Link
              href="/products/new"
              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Produk</span>
            </Link>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={filteredProducts}
        searchKey="namaBarang"
        searchPlaceholder="Cari berdasarkan nama atau kode barang..."
        filterComponent={filterComponent}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Produk?"
        description="Apakah Anda yakin ingin menghapus produk ini? Transaksi produk yang sudah tersimpan di riwayat akan tetap dipertahankan, namun produk tidak akan muncul lagi di daftar master."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
