"use client";

import { useState, useTransition, useEffect, useActionState } from "react";
import { createCategory, updateCategory, deleteCategory } from "@/actions/category.actions";
import { DataTable } from "@/components/shared/DataTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Edit, Trash2, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface CategoryWithCount {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    products: number;
  };
}

interface CategoriesClientProps {
  categories: CategoryWithCount[];
}

export function CategoriesClient({ categories }: CategoriesClientProps) {
  const router = useRouter();

  // Selected category for editing
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bind actions
  const formAction = editingCategory
    ? updateCategory.bind(null, editingCategory.id)
    : createCategory;

  const [state, action, isPending] = useActionState(formAction, null);

  // Form states reset/load
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setDescription(editingCategory.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [editingCategory]);

  // Handle Response actions
  useEffect(() => {
    if (state) {
      if (state.success) {
        toast.success(state.message);
        setEditingCategory(null);
        setName("");
        setDescription("");
        router.refresh();
      } else {
        toast.error(state.message);
      }
    }
  }, [state, router]);

  // Handle delete trigger
  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await deleteCategory(deleteId);
      if (res.success) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch (err) {
      toast.error("Gagal menghapus kategori");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const columns: ColumnDef<CategoryWithCount>[] = [
    {
      accessorKey: "name",
      header: "Kategori",
      cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.name}</span>,
    },
    {
      accessorKey: "description",
      header: "Deskripsi",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.description || "—"}</span>
      ),
    },
    {
      accessorKey: "_count.products",
      header: "Jumlah Produk",
      cell: ({ row }) => (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/10">
          {row.original._count.products} Barang
        </span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditingCategory(item)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition"
              title="Edit Kategori"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteId(item.id)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive transition"
              title="Hapus Kategori"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kategori Barang"
        description="Kelola kategori produk untuk mempermudah pencarian, analisis, dan pengorganisasian stok."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Form (Split Screen Inline) */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-bold text-foreground text-sm tracking-wide uppercase">
                {editingCategory ? "Ubah Kategori" : "Tambah Kategori Baru"}
              </h3>
              {editingCategory && (
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                  title="Batalkan Edit"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <form action={action} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                  Nama Kategori <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="E.g., Elektronik, Makanan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isPending}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
                {state?.errors?.name && (
                  <p className="text-xs text-destructive mt-1">{state.errors.name[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wider">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  name="description"
                  placeholder="Informasi singkat mengenai kategori produk..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 resize-none"
                />
                {state?.errors?.description && (
                  <p className="text-xs text-destructive mt-1">{state.errors.description[0]}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="flex-1 rounded-lg border border-border bg-card py-2 text-sm font-semibold text-foreground hover:bg-muted/30 transition"
                  >
                    Batal
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-2 flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm shadow-sm transition disabled:opacity-50 w-full"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingCategory ? "Simpan Perubahan" : "Simpan Kategori"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: DataTable list */}
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={categories}
            searchKey="name"
            searchPlaceholder="Cari nama kategori..."
          />
        </div>
      </div>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Hapus Kategori?"
        description="Apakah Anda yakin ingin menghapus kategori ini? Kategori tidak dapat dihapus jika masih terdapat produk aktif terkait."
        confirmLabel="Hapus"
        cancelLabel="Batal"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
