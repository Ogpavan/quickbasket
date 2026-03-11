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

function parseCsv(content) {
  const rows = [];
  let current = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }

      current.push(value);
      value = "";

      if (current.length > 1 || current[0] !== "") {
        rows.push(current);
      }

      current = [];
      continue;
    }

    value += char;
  }

  if (value.length > 0 || current.length > 0) {
    current.push(value);
    rows.push(current);
  }

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });
    return record;
  });
}

function buildQueryString(params) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

function normalizeKey(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSlugLoose(value) {
  return normalizeKey(value).replace(/-and-/g, "-");
}

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8217;|&rsquo;/g, "'");
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
      `products/categories?${buildQueryString({ per_page: perPage, page, hide_empty: false })}`,
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

async function findProductBySku(baseUrl, authHeader, sku) {
  if (!sku) {
    return null;
  }

  const results = await wcFetch(baseUrl, authHeader, `products?${buildQueryString({ sku })}`, { method: "GET" });
  return Array.isArray(results) && results.length > 0 ? results[0] : null;
}

async function updateProduct(baseUrl, authHeader, productId, payload) {
  if (payload.categories && payload.categories.length > 0) {
    console.log("UPDATE_CATEGORIES", productId, payload.categories.map((cat) => cat.id).join(","));
  }
  return wcFetch(baseUrl, authHeader, `products/${productId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

async function createProduct(baseUrl, authHeader, payload) {
  return wcFetch(baseUrl, authHeader, "products", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function run() {
  const csvPath = process.argv[2];
  const filterValue = process.argv[3];
  const mode = process.argv[4];
  const force = process.argv.includes("--force");
  const debug = process.argv.includes("--debug");

  if (!csvPath || !filterValue) {
    throw new Error("Usage: node scripts/import-woo-products.js <products.csv> <subcategory-name> [--category] [--force]");
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
  const csvContent = fs.readFileSync(csvPath, "utf8");
  const rows = parseCsv(csvContent);
  const target = filterValue.toLowerCase();
  const filtered =
    mode === "--category"
      ? rows.filter((row) => (row.category || "").toLowerCase() === target)
      : rows.filter((row) => (row.subcategory || "").toLowerCase() === target);

  if (filtered.length === 0) {
    console.log("No rows found for filter:", filterValue);
    return;
  }

  const categories = await fetchAllCategories(baseUrl, authHeader);
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category.id]));
  const categoryByLooseSlug = new Map(
    categories.map((category) => [normalizeSlugLoose(category.slug), category.id])
  );
  const categoryByName = new Map(
    categories.map((category) => [normalizeKey(decodeHtml(category.name)), category.id])
  );

  let createdCount = 0;
  let skippedCount = 0;
  let debugCount = 0;

  for (const row of filtered) {
    const sku = row.product_id;
    const existing = await findProductBySku(baseUrl, authHeader, sku);

    const categoryIds = [];
    const categoryId =
      categoryBySlug.get(row.category_slug) ||
      categoryByLooseSlug.get(normalizeSlugLoose(row.category_slug)) ||
      categoryByName.get(normalizeKey(row.category));
    const subcategoryId =
      categoryBySlug.get(row.subcategory_slug) ||
      categoryByLooseSlug.get(normalizeSlugLoose(row.subcategory_slug)) ||
      categoryByName.get(normalizeKey(row.subcategory));

    if (debug && debugCount < 3) {
      console.log("DEBUG_ROW", {
        product_id: row.product_id,
        name: row.name,
        category: row.category,
        category_slug: row.category_slug,
        subcategory: row.subcategory,
        subcategory_slug: row.subcategory_slug,
        resolved: { categoryId, subcategoryId },
        existingId: existing ? existing.id : null
      });
      debugCount += 1;
    }
    if (categoryId) {
      categoryIds.push({ id: categoryId });
    }
    if (subcategoryId) {
      categoryIds.push({ id: subcategoryId });
    }

    const payload = {
      name: row.name,
      slug: row.slug,
      type: "simple",
      status: "publish",
      sku,
      regular_price: row.regular_price || row.price,
      stock_status: row.in_stock === "yes" ? "instock" : "outofstock",
      categories: categoryIds,
      images: isAllowedImageUrl(row.image_url) ? [{ src: row.image_url }] : []
    };

    try {
      if (existing) {
        const existingIds = new Set((existing.categories ?? []).map((cat) => cat.id));
        const nextIds = categoryIds.map((cat) => cat.id).filter(Boolean);
        const shouldUpdate = force || nextIds.some((id) => !existingIds.has(id));

        if (shouldUpdate) {
          await updateProduct(baseUrl, authHeader, existing.id, {
            categories: Array.from(new Set([...existingIds, ...nextIds])).map((id) => ({ id }))
          });
        }

        skippedCount += 1;
      } else {
        await createProduct(baseUrl, authHeader, payload);
        createdCount += 1;
      }
    } catch (error) {
      const payloadError = extractWooErrorPayload(error);
      if (payloadError?.code === "woocommerce_rest_product_not_created") {
        skippedCount += 1;
        continue;
      }
      if (payloadError?.code === "woocommerce_rest_invalid_image" && payload.images?.length) {
        const retryPayload = { ...payload, images: [] };
        if (existing) {
          await updateProduct(baseUrl, authHeader, existing.id, retryPayload);
          skippedCount += 1;
        } else {
          await createProduct(baseUrl, authHeader, retryPayload);
          createdCount += 1;
        }
        continue;
      }

      throw error;
    }
  }

  console.log(`Import finished. Created: ${createdCount}, Skipped (existing): ${skippedCount}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
