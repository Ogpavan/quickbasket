import "server-only";

import mysql, { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

interface WordPressUserTables {
  users: string;
  usermeta: string;
}

interface SyncWordPressCustomerProfileInput {
  userId: number;
  name: string;
  phone: string;
  email: string;
}

interface ExistingUserRow extends RowDataPacket {
  ID: number;
}

interface UserMetaRow extends RowDataPacket {
  umeta_id: number;
}

declare global {
  var __quickBasketWpUserPool: Pool | undefined;
  var __quickBasketWpUserTables: WordPressUserTables | undefined;
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
  if (!globalThis.__quickBasketWpUserTables) {
    const { prefix } = getWordPressDbConfig();

    globalThis.__quickBasketWpUserTables = {
      users: escapeIdentifier(`${prefix}users`),
      usermeta: escapeIdentifier(`${prefix}usermeta`)
    };
  }

  return globalThis.__quickBasketWpUserTables;
}

function getPool() {
  if (!globalThis.__quickBasketWpUserPool) {
    const config = getWordPressDbConfig();

    globalThis.__quickBasketWpUserPool = mysql.createPool({
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

  return globalThis.__quickBasketWpUserPool;
}

function splitName(name: string) {
  const [firstName, ...rest] = name.trim().split(/\s+/);
  return {
    firstName: firstName ?? "",
    lastName: rest.join(" ")
  };
}

function buildUserNicename(name: string, userId: number) {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  return normalized || `user-${userId}`;
}

async function upsertUserMeta(
  connection: PoolConnection,
  tables: WordPressUserTables,
  userId: number,
  key: string,
  value: string
) {
  const [rows] = await connection.query<UserMetaRow[]>(
    `SELECT umeta_id
     FROM ${tables.usermeta}
     WHERE user_id = ? AND meta_key = ?
     ORDER BY umeta_id ASC
     LIMIT 1`,
    [userId, key]
  );

  if (rows.length > 0) {
    await connection.query(
      `UPDATE ${tables.usermeta}
       SET meta_value = ?
       WHERE umeta_id = ?
       LIMIT 1`,
      [value, rows[0].umeta_id]
    );
    return;
  }

  await connection.query(
    `INSERT INTO ${tables.usermeta} (user_id, meta_key, meta_value)
     VALUES (?, ?, ?)`,
    [userId, key, value]
  );
}

export async function syncWordPressCustomerProfile(input: SyncWordPressCustomerProfileInput) {
  if (!Number.isInteger(input.userId) || input.userId <= 0) {
    throw new Error("Invalid WordPress user ID.");
  }

  const displayName = input.name.trim() || input.phone.trim();
  const phone = input.phone.replace(/\D/g, "").slice(-10);
  const email = input.email.trim();

  if (displayName.length < 2 || phone.length !== 10 || !email) {
    throw new Error("Missing user profile fields required for WordPress sync.");
  }

  const { firstName, lastName } = splitName(displayName);
  const nicename = buildUserNicename(displayName, input.userId);
  const tables = getTableNames();
  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [users] = await connection.query<ExistingUserRow[]>(
      `SELECT ID
       FROM ${tables.users}
       WHERE ID = ?
       LIMIT 1`,
      [input.userId]
    );

    if (users.length === 0) {
      throw new Error("WooCommerce customer is missing from the WordPress users table.");
    }

    await connection.query(
      `UPDATE ${tables.users}
       SET user_email = ?, display_name = ?, user_nicename = ?
       WHERE ID = ?
       LIMIT 1`,
      [email, displayName, nicename, input.userId]
    );

    const metaPairs: Array<[string, string]> = [
      ["first_name", firstName],
      ["last_name", lastName],
      ["nickname", displayName],
      ["billing_first_name", firstName],
      ["billing_last_name", lastName],
      ["billing_phone", phone],
      ["billing_email", email],
      ["shipping_first_name", firstName],
      ["shipping_last_name", lastName],
      ["shipping_phone", phone],
      ["quickbasket_phone", phone]
    ];

    for (const [key, value] of metaPairs) {
      await upsertUserMeta(connection, tables, input.userId, key, value);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
