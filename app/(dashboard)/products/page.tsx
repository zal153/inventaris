import { getProducts } from "@/actions/product.actions";
import { getCategories } from "@/actions/category.actions";
import { ProductListClient } from "@/components/products/ProductListClient";

export const metadata = {
  title: "Master Barang",
};

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  return (
    <div className="animate-fade-in">
      <ProductListClient products={products} categories={categories} />
    </div>
  );
}
