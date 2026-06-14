import { getCategories } from "@/actions/category.actions";
import { CategoriesClient } from "@/components/categories/CategoriesClient";

export const metadata = {
  title: "Kategori Barang",
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="animate-fade-in">
      <CategoriesClient categories={categories} />
    </div>
  );
}
