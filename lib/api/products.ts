import { GroceryProduct } from "@/types/product";

interface FetchProductsPageParams {
  category: string;
  page: number;
  perPage: number;
  search?: string;
}

interface FetchProductsPageResponse {
  products: GroceryProduct[];
  page: number;
  perPage: number;
  hasMore: boolean;
}

export async function fetchProductsPage({
  category,
  page,
  perPage,
  search
}: FetchProductsPageParams): Promise<FetchProductsPageResponse> {
  const params = new URLSearchParams({
    category,
    page: String(page),
    perPage: String(perPage)
  });

  if (search?.trim()) {
    params.set("search", search.trim());
  }

  const response = await fetch(`/api/products?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return (await response.json()) as FetchProductsPageResponse;
}
