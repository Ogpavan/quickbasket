export type DietType = "veg" | "non-veg" | "vegan";

export interface GroceryCategory {
  name: string;
  slug: string;
  image: string;
  theme: string;
}

export interface GroceryProduct {
  id: number;
  name: string;
  slug: string;
  price: number;
  weight: string;
  image: string;
  hasImage?: boolean;
  category: string;
  categorySlug: string;
  categorySlugs?: string[];
  brand: string;
  stock: number;
  dietType: DietType;
  description: string;
  packSizes?: string[];
  tags?: string[];
  frequentlyBought?: boolean;
  dailyEssential?: boolean;
  featured?: boolean;
  taxClass?: string;
  handlingFee?: number;
}

export interface CartLineItem {
  lineId: string;
  productId: GroceryProduct["id"];
  slug: GroceryProduct["slug"];
  name: GroceryProduct["name"];
  brand: GroceryProduct["brand"];
  image: GroceryProduct["image"];
  price: GroceryProduct["price"];
  weight: string;
  quantity: number;
  stock: GroceryProduct["stock"];
  taxClass?: GroceryProduct["taxClass"];
  handlingFee?: GroceryProduct["handlingFee"];
}
