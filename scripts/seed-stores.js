const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const contents = fs.readFileSync(envPath, "utf-8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function sanitizePrefix(prefix) {
  if (!prefix) {
    return "wp_";
  }
  const safe = prefix.replace(/[^a-zA-Z0-9_]/g, "");
  return safe || "wp_";
}

async function main() {
  loadEnvFile();

  const host = process.env.WORDPRESS_DB_HOST;
  const port = Number(process.env.WORDPRESS_DB_PORT || 3306);
  const user = process.env.WORDPRESS_DB_USER;
  const password = process.env.WORDPRESS_DB_PASSWORD;
  const database = process.env.WORDPRESS_DB_NAME;
  const prefix = sanitizePrefix(process.env.WORDPRESS_DB_PREFIX || "wp_");

  if (!host || !user || !password || !database) {
    throw new Error("Missing DB env vars. Check .env.local for WORDPRESS_DB_* values.");
  }

  const table = `${prefix}stores`;
  const rows = [
    [
      "Bareilly City Center Store",
      28.3670,
      79.4304,
      5,
      "Civil Lines, Bareilly, Uttar Pradesh",
      1
    ],
    [
      "Bareilly Satellite Bus Stand Store",
      28.4037,
      79.4440,
      5,
      "Satellite Bus Stand Area, Bareilly, Uttar Pradesh",
      1
    ]
  ];

  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database
  });

  try {
    const [result] = await connection.query(
      `INSERT INTO \`${table}\` (name, latitude, longitude, delivery_radius, address, status) VALUES ?`,
      [rows]
    );
    console.log("Inserted stores:", result);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error("Seed failed:", error.message || error);
  process.exitCode = 1;
});
