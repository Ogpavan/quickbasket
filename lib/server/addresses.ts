import "server-only";

import mysql, { Pool, RowDataPacket } from "mysql2/promise";

export interface AddressRecord {
  id: number;
  label: string;
  name: string;
  house_no: string;
  building_name: string;
  floor: string | null;
  area: string;
  landmark: string;
  address_line: string | null;
  city: string | null;
  phone: string | null;
}

interface AddressTableNames {
  addresses: string;
}

declare global {
  var __quickBasketAddressPool: Pool | undefined;
  var __quickBasketAddressSchemaReady: Promise<void> | undefined;
  var __quickBasketAddressTables: AddressTableNames | undefined;
}

function escapeIdentifier(identifier: string) {
  return `\`${identifier.replaceAll("`", "``")}\``;
}

function getWordPressDbConfig() {
  const host = process.env.WORDPRESS_DB_HOST?.trim();
  const port = Number.parseInt(process.env.WORDPRESS_DB_PORT?.trim() ?? "3306", 10);
  const database = process.env.WORDPRESS_DB_NAME?.trim();
  const user = process.env.WORDPRESS_DB_USER?.trim();
  const password = process.env.WORDPRESS_DB_PASSWORD ?? "";
  const prefix = process.env.WORDPRESS_DB_PREFIX?.trim() || "wp_";

  if (!host || !database || !user) {
    throw new Error("WordPress database credentials are not configured.");
  }

  if (!/^[A-Za-z0-9_]+$/.test(prefix)) {
    throw new Error("WORDPRESS_DB_PREFIX contains unsupported characters.");
  }

  return {
    host,
    port: Number.isFinite(port) ? port : 3306,
    database,
    user,
    password,
    prefix
  };
}

function getTableNames() {
  if (!globalThis.__quickBasketAddressTables) {
    const { prefix } = getWordPressDbConfig();

    globalThis.__quickBasketAddressTables = {
      addresses: escapeIdentifier(`${prefix}quickbasket_addresses`)
    };
  }

  return globalThis.__quickBasketAddressTables;
}

function getPool() {
  if (!globalThis.__quickBasketAddressPool) {
    const config = getWordPressDbConfig();

    globalThis.__quickBasketAddressPool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: false
    });
  }

  return globalThis.__quickBasketAddressPool;
}

async function ensureSchema() {
  if (!globalThis.__quickBasketAddressSchemaReady) {
    const pool = getPool();
    const tables = getTableNames();

    globalThis.__quickBasketAddressSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tables.addresses} (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT UNSIGNED NOT NULL,
          label VARCHAR(64) NOT NULL,
          name VARCHAR(255) NOT NULL,
          house_no VARCHAR(120) NOT NULL,
          building_name VARCHAR(255) NOT NULL,
          floor VARCHAR(64) NULL DEFAULT NULL,
          area VARCHAR(160) NOT NULL,
          landmark VARCHAR(255) NOT NULL,
          address_line VARCHAR(255) NULL DEFAULT NULL,
          city VARCHAR(120) NULL DEFAULT NULL,
          phone VARCHAR(32) NULL DEFAULT NULL,
          created_at BIGINT NOT NULL,
          updated_at BIGINT NOT NULL,
          INDEX idx_user_updated (user_id, updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      const config = getWordPressDbConfig();
      const [columns] = await pool.query<RowDataPacket[]>(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [config.database, `${config.prefix}quickbasket_addresses`]
      );
      const existing = new Set(columns.map((row) => row.COLUMN_NAME));
      const addColumn = async (definition: string) => {
        await pool.query(`ALTER TABLE ${tables.addresses} ADD COLUMN ${definition}`);
      };

      if (!existing.has("house_no")) {
        await addColumn("house_no VARCHAR(120) NOT NULL DEFAULT ''");
      }
      if (!existing.has("building_name")) {
        await addColumn("building_name VARCHAR(255) NOT NULL DEFAULT ''");
      }
      if (!existing.has("floor")) {
        await addColumn("floor VARCHAR(64) NULL DEFAULT NULL");
      }
      if (!existing.has("area")) {
        await addColumn("area VARCHAR(160) NOT NULL DEFAULT ''");
      }
      if (!existing.has("landmark")) {
        await addColumn("landmark VARCHAR(255) NOT NULL DEFAULT ''");
      }
      if (!existing.has("address_line")) {
        await addColumn("address_line VARCHAR(255) NULL DEFAULT NULL");
      }
      if (!existing.has("city")) {
        await addColumn("city VARCHAR(120) NULL DEFAULT NULL");
      }
      if (!existing.has("phone")) {
        await addColumn("phone VARCHAR(32) NULL DEFAULT NULL");
      }

      // Normalize legacy columns to nullable so optional fields don't break inserts.
      await pool.query(`ALTER TABLE ${tables.addresses} MODIFY COLUMN address_line VARCHAR(255) NULL DEFAULT NULL`);
      await pool.query(`ALTER TABLE ${tables.addresses} MODIFY COLUMN city VARCHAR(120) NULL DEFAULT NULL`);
      await pool.query(`ALTER TABLE ${tables.addresses} MODIFY COLUMN phone VARCHAR(32) NULL DEFAULT NULL`);
    })();
  }

  await globalThis.__quickBasketAddressSchemaReady;
}

export async function listAddresses(userId: number): Promise<AddressRecord[]> {
  await ensureSchema();
  const pool = getPool();
  const tables = getTableNames();

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, label, name, house_no, building_name, floor, area, landmark, address_line, city, phone
     FROM ${tables.addresses}
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId]
  );

  return rows as AddressRecord[];
}

export async function createAddress(userId: number, data: Omit<AddressRecord, "id">) {
  await ensureSchema();
  const pool = getPool();
  const tables = getTableNames();
  const now = Date.now();

  const [result] = await pool.query<mysql.ResultSetHeader>(
    `INSERT INTO ${tables.addresses}
     (user_id, label, name, house_no, building_name, floor, area, landmark, address_line, city, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      data.label,
      data.name,
      data.house_no,
      data.building_name,
      data.floor ?? null,
      data.area,
      data.landmark,
      data.address_line ?? null,
      data.city ?? null,
      data.phone ?? null,
      now,
      now
    ]
  );

  return {
    id: result.insertId,
    ...data
  } as AddressRecord;
}

export async function updateAddress(userId: number, id: number, data: Partial<Omit<AddressRecord, "id">>) {
  await ensureSchema();
  const pool = getPool();
  const tables = getTableNames();
  const now = Date.now();

  const fields = [];
  const values: Array<string | number | null> = [];

  if (data.label !== undefined) {
    fields.push("label = ?");
    values.push(data.label);
  }
  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(data.name);
  }
  if (data.house_no !== undefined) {
    fields.push("house_no = ?");
    values.push(data.house_no);
  }
  if (data.building_name !== undefined) {
    fields.push("building_name = ?");
    values.push(data.building_name);
  }
  if (data.floor !== undefined) {
    fields.push("floor = ?");
    values.push(data.floor);
  }
  if (data.area !== undefined) {
    fields.push("area = ?");
    values.push(data.area);
  }
  if (data.landmark !== undefined) {
    fields.push("landmark = ?");
    values.push(data.landmark);
  }
  if (data.address_line !== undefined) {
    fields.push("address_line = ?");
    values.push(data.address_line);
  }
  if (data.city !== undefined) {
    fields.push("city = ?");
    values.push(data.city);
  }
  if (data.phone !== undefined) {
    fields.push("phone = ?");
    values.push(data.phone);
  }

  if (fields.length === 0) {
    return null;
  }

  fields.push("updated_at = ?");
  values.push(now, id, userId);

  const [result] = await pool.query<mysql.ResultSetHeader>(
    `UPDATE ${tables.addresses}
     SET ${fields.join(", ")}
     WHERE id = ? AND user_id = ?`,
    values
  );

  return result.affectedRows > 0;
}

export async function deleteAddress(userId: number, id: number) {
  await ensureSchema();
  const pool = getPool();
  const tables = getTableNames();

  const [result] = await pool.query<mysql.ResultSetHeader>(
    `DELETE FROM ${tables.addresses} WHERE id = ? AND user_id = ?`,
    [id, userId]
  );

  return result.affectedRows > 0;
}
