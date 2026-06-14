import { getCategories } from "@/actions/category.actions";
import { ProductForm } from "@/components/products/ProductForm";
import { PageHeader } from "@/components/shared/PageHeader";

export const metadata = {
  title: "Tambah Produk Baru",
};

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tambah Produk Baru"
        description="Lengkapi informasi detail produk barang untuk ditambahkan ke database master."
      />
      <div className="w-full">
        <ProductForm categories={categories} />
      </div>
    </div>
  );
}
