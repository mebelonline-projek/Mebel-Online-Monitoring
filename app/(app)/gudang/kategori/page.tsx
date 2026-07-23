import { CategoryListClient } from "@/components/inventory/category-list-client";
import { getCategories, type CategoryRow } from "@/lib/inventory";

export default async function GudangKategoriPage() {
  let categories: CategoryRow[] = [];
  let loadError: string | null = null;
  try {
    categories = await getCategories();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Gagal memuat kategori";
  }

  return <CategoryListClient initialCategories={categories} loadError={loadError} />;
}
