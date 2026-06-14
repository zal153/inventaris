import { getProductById } from "@/actions/product.actions";
import { getCategories } from "@/actions/category.actions";
import { ProductForm } from "@/components/products/ProductForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { notFound } from "next/navigation";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Edit Produk",
};

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategories(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={`Edit Produk: ${product.namaBarang}`}
        description="Perbarui data persediaan barang dagang, harga jual, minimum stok, atau informasi lainnya."
      />
      <div className="w-full">
        <ProductForm categories={categories} initialData={product} />
      </div>
    </div>
  );
}
