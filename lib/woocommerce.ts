import { GroceryProduct } from "@/types/product";
import { slugify } from "@/lib/utils";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80";
const DEFAULT_BRAND = "QuickBasket";

interface WooImage {
  src: string;
}

interface WooTerm {
  name: string;
  slug: string;
}

interface WooAttribute {
  name: string;
  slug: string;
  options: string[];
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price?: string;
  featured?: boolean;
  on_sale?: boolean;
  weight?: string;
  stock_quantity?: number;
  stock_status?: string;
  images: WooImage[];
  categories: WooTerm[];
  brands?: WooTerm[];
  tags?: WooTerm[];
  attributes: WooAttribute[];
}

export interface WooCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

interface WooOrderLineItemPayload {
  product_id: number;
  quantity: number;
  subtotal?: string;
  total?: string;
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

interface WooOrderShippingLinePayload {
  method_id: string;
  method_title: string;
  total: string;
}

interface WooOrderAddressPayload {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

export interface WooOrder {
  id: number;
  status: string;
  total: string;
  payment_method: string;
}

interface WooOrderPayload {
  payment_method: string;
  payment_method_title: string;
  set_paid: boolean;
  status: string;
  customer_id: number;
  billing: WooOrderAddressPayload;
  shipping: WooOrderAddressPayload;
  line_items: WooOrderLineItemPayload[];
  shipping_lines?: WooOrderShippingLinePayload[];
  customer_note?: string;
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

interface WooProductCategory {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  image?: {
    src: string;
  };
  count?: number;
}

interface WooOrderSummary {
  id: number;
  status: string;
  total: string;
  payment_method: string;
  date_created: string;
}

interface WooOrderLineItem {
  id: number;
  product_id: number;
  name: string;
  quantity: number;
  total: string;
  image?: {
    src?: string;
  };
  meta_data?: Array<{
    key: string;
    value: string;
  }>;
}

export interface WooOrderWithItems extends WooOrderSummary {
  line_items: Array<WooOrderLineItem & { image?: string }>;
}

export async function fetchWooOrdersForCustomer(customerId: number, maxPerPage = 20) {
  return wcFetch<WooOrderSummary[]>(
    `orders?customer=${customerId}&per_page=${maxPerPage}&status=any&order=desc`
  );
}

async function fetchWooProductsByIds(ids: number[]) {
  const unique = Array.from(new Set(ids)).filter((id) => Number.isFinite(id) && id > 0);
  if (unique.length === 0) {
    return [] as WooProduct[];
  }

  const batches: WooProduct[] = [];
  const chunkSize = 80;

  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const products = await wcFetch<WooProduct[]>(
      `products?${buildQueryString({
        include: chunk.join(","),
        per_page: chunk.length,
        status: "publish"
      })}`
    );
    batches.push(...products);
  }

  return batches;
}

export async function fetchWooOrdersForCustomerWithItems(customerId: number, maxPerPage = 20) {
  const orders = await wcFetch<Array<WooOrderSummary & { line_items: WooOrderLineItem[] }>>(
    `orders?customer=${customerId}&per_page=${maxPerPage}&status=any&order=desc`
  );

  const productIds = orders.flatMap((order) => order.line_items?.map((item) => item.product_id) ?? []);
  const products = await fetchWooProductsByIds(productIds);
  const imageById = new Map(products.map((product) => [product.id, getImage(product.images ?? [])]));

  return orders.map((order) => ({
    ...order,
    line_items: (order.line_items ?? []).map((item) => ({
      ...item,
      image:
        item.image?.src ||
        item.meta_data?.find((meta) => meta.key.toLowerCase() === "image")?.value ||
        imageById.get(item.product_id) ||
        ""
    }))
  })) as WooOrderWithItems[];
}

function getWooConfig() {
  const baseUrl = process.env.WORDPRESS_URL;
  const consumerKey = process.env.WC_CONSUMER_KEY;
  const consumerSecret = process.env.WC_CONSUMER_SECRET;

  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error("WooCommerce environment variables are not configured.");
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    consumerKey,
    consumerSecret
  };
}

function buildQueryString(params: Record<string, string | number | undefined>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8217;|&rsquo;/g, "'");
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanText(value: string) {
  return decodeHtml(stripHtml(value))
    .replace(/\s+/g, " ")
    .trim();
}

function getImage(images: WooImage[]) {
  return images.find((image) => image.src)?.src ?? DEFAULT_IMAGE;
}

function extractPackSizes(attributes: WooAttribute[]) {
  return attributes
    .filter((attribute) => {
      const key = `${attribute.slug} ${attribute.name}`.toLowerCase();
      return key.includes("size") || key.includes("weight") || key.includes("pack") || key.includes("volume");
    })
    .flatMap((attribute) => attribute.options)
    .filter(Boolean);
}

function extractWeight(product: WooProduct, packSizes: string[]) {
  if (packSizes.length > 0) {
    return packSizes[0];
  }

  if (product.weight) {
    return product.weight;
  }

  const weightMatch = `${product.name} ${product.short_description} ${product.description}`.match(
    /(\d+(?:\.\d+)?)\s?(kg|g|gm|mg|l|ml|pcs|pc|pack)s?/i
  );

  if (weightMatch) {
    return `${weightMatch[1]} ${weightMatch[2].toLowerCase()}`;
  }

  return "1 pack";
}

function extractDietType(product: WooProduct) {
  const tags = [...(product.tags ?? []), ...(product.categories ?? [])].map((term) => term.name.toLowerCase());

  if (tags.some((value) => value.includes("egg") || value.includes("meat") || value.includes("non-veg"))) {
    return "non-veg" as const;
  }

  if (tags.some((value) => value.includes("vegan"))) {
    return "vegan" as const;
  }

  return "veg" as const;
}

export function mapWooProduct(product: WooProduct): GroceryProduct {
  const categorySlugs = (product.categories ?? []).map((category) => category.slug).filter(Boolean);
  const primaryCategory = product.categories?.length
    ? product.categories[product.categories.length - 1]
    : undefined;
  const categoryName = decodeHtml(primaryCategory?.name ?? product.categories?.[0]?.name ?? "Daily Essentials");
  const categorySlug = primaryCategory?.slug ?? product.categories?.[0]?.slug ?? slugify(categoryName);
  const packSizes = extractPackSizes(product.attributes ?? []);
  const weight = extractWeight(product, packSizes);
  const description = cleanText(product.short_description || product.description || product.name);
  const tags = (product.tags ?? []).map((tag) => decodeHtml(tag.name));

  return {
    id: product.id,
    name: decodeHtml(product.name),
    slug: product.slug,
    brand: decodeHtml(product.brands?.[0]?.name ?? DEFAULT_BRAND),
    price: Number(product.price || product.regular_price || 0),
    weight,
    image: getImage(product.images ?? []),
    hasImage: (product.images ?? []).length > 0,
    category: categoryName,
    categorySlug,
    categorySlugs: categorySlugs.length ? categorySlugs : undefined,
    stock: product.stock_quantity ?? (product.stock_status === "outofstock" ? 0 : 20),
    dietType: extractDietType(product),
    description,
    packSizes,
    tags,
    featured: Boolean(product.featured),
    frequentlyBought: Boolean(product.featured || product.on_sale),
    dailyEssential: true
  };
}

export async function wcFetch<T>(path: string, init?: RequestInit) {
  const { baseUrl, consumerKey, consumerSecret } = getWooConfig();
  const url = new URL(`/wp-json/wc/v3/${path.replace(/^\//, "")}`, baseUrl);
  const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const method = init?.method?.toUpperCase() ?? "GET";
  const requestInit: RequestInit & {
    next?: {
      revalidate?: number | false;
    };
  } = {
    ...init,
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  };

  if (method === "GET") {
    if (init?.cache) {
      requestInit.cache = init.cache;
    } else {
      requestInit.next = {
        revalidate: 60
      };
    }
  } else {
    requestInit.cache = "no-store";
  }

  const response = await fetch(url.toString(), requestInit);

  if (!response.ok) {
    throw new Error(`WooCommerce request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchWooProducts() {
  const products = await wcFetch<WooProduct[]>("products?status=publish&per_page=100");
  return products.map((product) => mapWooProduct(product));
}

export async function fetchWooProductsPage({
  page = 1,
  perPage = 24,
  search,
  categoryId
}: {
  page?: number;
  perPage?: number;
  search?: string;
  categoryId?: number;
}) {
  const params: Record<string, string | number | undefined> = {
    status: "publish",
    per_page: perPage,
    page
  };

  if (typeof categoryId === "number" && categoryId > 0) {
    params.category = categoryId;
  }

  if (search) {
    params.search = search;
  }

  const products = await wcFetch<WooProduct[]>(`products?${buildQueryString(params)}`);
  return products.map((product) => mapWooProduct(product));
}

export async function fetchWooProductsByCategoryId(categoryId: number, maxPerPage = 100) {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return [];
  }

  const products: WooProduct[] = [];
  let page = 1;

  while (true) {
    const batch = await wcFetch<WooProduct[]>(
      `products?${buildQueryString({ status: "publish", category: categoryId, per_page: maxPerPage, page })}`
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    products.push(...batch);

    if (batch.length < maxPerPage) {
      break;
    }

    page += 1;
  }

  return products.map((product) => mapWooProduct(product));
}

export async function fetchWooProductBySlug(slug: string) {
  if (!slug.trim()) {
    return null;
  }

  const products = await wcFetch<WooProduct[]>(
    `products?${buildQueryString({ status: "publish", slug })}`
  );

  if (!Array.isArray(products) || products.length === 0) {
    return null;
  }

  return mapWooProduct(products[0]);
}

export async function fetchWooProductsByTag(tag: string, maxPerPage = 100) {
  if (!tag.trim()) {
    return [];
  }

  const tags = await wcFetch<Array<{ id: number; name: string; slug: string }>>(
    `products/tags?${buildQueryString({ search: tag.trim() })}`
  );
  const matchedTag = tags.find(
    (entry) => entry.slug.toLowerCase() === tag.toLowerCase() || entry.name.toLowerCase() === tag.toLowerCase()
  );

  if (!matchedTag) {
    return [];
  }

  const products = await wcFetch<WooProduct[]>(
    `products?${buildQueryString({ status: "publish", tag: matchedTag.id, per_page: maxPerPage })}`
  );

  return products.map((product) => mapWooProduct(product));
}

function splitName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);

  return {
    firstName: firstName ?? "",
    lastName: rest.join(" ")
  };
}

export function buildPlaceholderEmail(phone: string) {
  const normalizedPhone = phone.replace(/\D/g, "");
  return `${normalizedPhone}@quickbasket.local`;
}

export function splitCustomerName(name: string) {
  return splitName(name);
}

export async function findWooCustomerByEmail(email: string) {
  const customers = await wcFetch<WooCustomer[]>(`customers?email=${encodeURIComponent(email)}`, {
    cache: "no-store"
  });
  return customers[0] ?? null;
}

export async function upsertWooCustomer({
  name,
  phone
}: {
  name: string;
  phone: string;
}) {
  const email = buildPlaceholderEmail(phone);
  const { firstName, lastName } = splitName(name);
  const payload = {
    email,
    first_name: firstName,
    last_name: lastName,
    billing: {
      first_name: firstName,
      last_name: lastName,
      email,
      phone
    }
  };
  const existingCustomer = await findWooCustomerByEmail(email);

  if (existingCustomer) {
    return wcFetch<WooCustomer>(`customers/${existingCustomer.id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  return wcFetch<WooCustomer>("customers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createWooOrder(payload: WooOrderPayload) {
  return wcFetch<WooOrder>("orders", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchWooProductCategories() {
  const categories: WooProductCategory[] = [];
  const perPage = 100;
  let page = 1;

  while (true) {
    const batch = await wcFetch<WooProductCategory[]>(
      `products/categories?per_page=${perPage}&hide_empty=false&page=${page}`
    );

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    categories.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return categories;
}
