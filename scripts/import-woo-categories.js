const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    const idx = line.indexOf("=");
    if (idx === -1) {
      continue;
    }

    const key = line.slice(0, idx);
    const value = line.slice(idx + 1);
    env[key] = value;
  }

  return env;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

function isAllowedImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") {
    return false;
  }

  if (!imageUrl.startsWith("http")) {
    return false;
  }

  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname.toLowerCase();
    return /\.(png|jpe?g|webp)$/.test(pathname);
  } catch {
    return false;
  }
}

function extractWooErrorPayload(error) {
  if (!error || typeof error.message !== "string") {
    return null;
  }

  const match = error.message.match(/WooCommerce \d+:\s*(\{.*\})/s);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function wcFetch(baseUrl, authHeader, apiPath, init) {
  const url = new URL(`/wp-json/wc/v3/${apiPath.replace(/^\//, "")}`, baseUrl);
  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`WooCommerce ${response.status}: ${text}`);
  }

  return response.json();
}

async function fetchAllCategories(baseUrl, authHeader) {
  const categories = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const batch = await wcFetch(
      baseUrl,
      authHeader,
      `products/categories?${buildQueryString({ per_page: perPage, page })}`,
      { method: "GET" }
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

async function ensureCategory({
  baseUrl,
  authHeader,
  name,
  imageUrl,
  parentId,
  existingMap
}) {
  const key = `${parentId}:${name.toLowerCase().trim()}`;

  if (existingMap.has(key)) {
    return existingMap.get(key);
  }

  const payload = {
    name,
    slug: slugify(name),
    parent: parentId
  };

  if (isAllowedImageUrl(imageUrl)) {
    payload.image = { src: imageUrl };
  }

  try {
    const created = await wcFetch(baseUrl, authHeader, "products/categories", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    existingMap.set(key, created.id);
    return created.id;
  } catch (error) {
    const payload = extractWooErrorPayload(error);
    const existingId = payload?.data?.resource_id;

    if (payload?.code === "term_exists" && existingId) {
      existingMap.set(key, existingId);
      return existingId;
    }

    throw error;
  }
}

async function run() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    throw new Error("Usage: node scripts/import-woo-categories.js <categories.json>");
  }

  const envPath = path.join(process.cwd(), ".env.local");
  const env = loadEnvFile(envPath);
  const baseUrl = env.WORDPRESS_URL;
  const consumerKey = env.WC_CONSUMER_KEY;
  const consumerSecret = env.WC_CONSUMER_SECRET;

  if (!baseUrl || !consumerKey || !consumerSecret) {
    throw new Error("Missing WooCommerce credentials in .env.local");
  }

  const authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
  const payload = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  if (!payload?.categories || !Array.isArray(payload.categories)) {
    throw new Error("Invalid categories JSON format.");
  }

  const existing = await fetchAllCategories(baseUrl, authHeader);
  const existingMap = new Map(
    existing.map((category) => [`${category.parent ?? 0}:${category.name.toLowerCase().trim()}`, category.id])
  );

  for (const category of payload.categories) {
    const parentId = await ensureCategory({
      baseUrl,
      authHeader,
      name: category.name,
      imageUrl: category.imageUrl,
      parentId: 0,
      existingMap
    });

    const subcategories = Array.isArray(category.subcategories) ? category.subcategories : [];

    for (const subcategory of subcategories) {
      await ensureCategory({
        baseUrl,
        authHeader,
        name: subcategory.name,
        imageUrl: subcategory.imageUrl,
        parentId,
        existingMap
      });
    }
  }

  console.log("Category import complete.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
