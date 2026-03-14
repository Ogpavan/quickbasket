import "server-only";

import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import mysql, { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

type RateLimitAction = "send" | "verify";
type RateLimitScopeType = "phone" | "ip";

interface OtpChallengeRecord extends RowDataPacket {
  id: string;
  phone: string;
  name: string;
  otp_hash: string;
  otp_length: number;
  expires_at: number;
  created_at: number;
  sent_at: number;
  verified_at: number | null;
  invalidated_at: number | null;
  verify_attempt_count: number;
  max_verify_attempts: number;
}

interface RecentEventCountRow extends RowDataPacket {
  count: number;
  oldest_created_at: number | null;
}

interface SendOtpInput {
  name: string;
  phone: string;
  ipAddress: string | null;
  userAgent: string | null;
}

interface VerifyOtpInput {
  requestId: string;
  phone: string;
  otp: string;
  ipAddress: string | null;
}

export interface SendOtpResult {
  requestId: string;
  expiresAt: string;
  resendAvailableAt: string;
  otpLength: number;
}

export interface VerifyOtpResult {
  name: string;
  phone: string;
}

interface LimitRule {
  action: RateLimitAction;
  scopeType: RateLimitScopeType;
  scopeKey: string;
  maxCount: number;
  windowMs: number;
  errorMessage: string;
}

interface OtpTableNames {
  challenges: string;
  rateLimitEvents: string;
}

declare global {
  var __quickBasketOtpPool: Pool | undefined;
  var __quickBasketOtpSchemaReady: Promise<void> | undefined;
  var __quickBasketOtpTables: OtpTableNames | undefined;
}

function getNumberEnv(name: string, fallback: number) {
  const rawValue = process.env[name];

  if (!rawValue) {
    return fallback;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function getOtpLength() {
  return getNumberEnv("OTP_LENGTH", 4);
}

function getOtpTtlMs() {
  return getNumberEnv("OTP_TTL_SECONDS", 120) * 1000;
}

function getSendCooldownMs() {
  return getNumberEnv("OTP_SEND_COOLDOWN_SECONDS", 30) * 1000;
}

function getMaxVerifyAttempts() {
  return getNumberEnv("OTP_MAX_ATTEMPTS_PER_CHALLENGE", 5);
}

function getPhoneSendLimit() {
  return getNumberEnv("OTP_SEND_LIMIT_PER_PHONE_WINDOW", 3);
}

function getPhoneSendWindowMs() {
  return getNumberEnv("OTP_SEND_LIMIT_WINDOW_SECONDS", 900) * 1000;
}

function getIpSendLimit() {
  return getNumberEnv("OTP_SEND_LIMIT_PER_IP_WINDOW", 10);
}

function getIpSendWindowMs() {
  return getNumberEnv("OTP_SEND_IP_LIMIT_WINDOW_SECONDS", 3600) * 1000;
}

function getPhoneVerifyLimit() {
  return getNumberEnv("OTP_VERIFY_LIMIT_PER_PHONE_WINDOW", 8);
}

function getPhoneVerifyWindowMs() {
  return getNumberEnv("OTP_VERIFY_LIMIT_WINDOW_SECONDS", 900) * 1000;
}

function getIpVerifyLimit() {
  return getNumberEnv("OTP_VERIFY_LIMIT_PER_IP_WINDOW", 20);
}

function getIpVerifyWindowMs() {
  return getNumberEnv("OTP_VERIFY_IP_LIMIT_WINDOW_SECONDS", 3600) * 1000;
}

function getOtpHashSecret() {
  return process.env.OTP_HASH_SECRET?.trim() || process.env.SMS_AUTH_KEY?.trim() || "quickbasket-otp-secret";
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
    throw new OtpServiceError("WordPress database credentials are not configured on the server.", 500);
  }

  if (!/^[A-Za-z0-9_]+$/.test(prefix)) {
    throw new OtpServiceError("WORDPRESS_DB_PREFIX contains unsupported characters.", 500);
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
  if (!globalThis.__quickBasketOtpTables) {
    const { prefix } = getWordPressDbConfig();

    globalThis.__quickBasketOtpTables = {
      challenges: escapeIdentifier(`${prefix}quickbasket_otp_challenges`),
      rateLimitEvents: escapeIdentifier(`${prefix}quickbasket_otp_rate_limit_events`)
    };
  }

  return globalThis.__quickBasketOtpTables;
}

function getPool() {
  if (!globalThis.__quickBasketOtpPool) {
    const config = getWordPressDbConfig();

    globalThis.__quickBasketOtpPool = mysql.createPool({
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

  return globalThis.__quickBasketOtpPool;
}

async function ensureSchema() {
  if (!globalThis.__quickBasketOtpSchemaReady) {
    const pool = getPool();
    const tables = getTableNames();

    globalThis.__quickBasketOtpSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tables.challenges} (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          phone VARCHAR(20) NOT NULL,
          name VARCHAR(255) NOT NULL,
          otp_hash CHAR(64) NOT NULL,
          otp_length TINYINT UNSIGNED NOT NULL,
          expires_at BIGINT NOT NULL,
          created_at BIGINT NOT NULL,
          sent_at BIGINT NOT NULL,
          verified_at BIGINT NULL DEFAULT NULL,
          invalidated_at BIGINT NULL DEFAULT NULL,
          verify_attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
          max_verify_attempts INT UNSIGNED NOT NULL DEFAULT 5,
          ip_address VARCHAR(64) NULL DEFAULT NULL,
          user_agent VARCHAR(512) NULL DEFAULT NULL,
          INDEX idx_phone_created_at (phone, created_at),
          INDEX idx_phone_active (phone, verified_at, invalidated_at, expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ${tables.rateLimitEvents} (
          id VARCHAR(64) NOT NULL PRIMARY KEY,
          action VARCHAR(16) NOT NULL,
          scope_type VARCHAR(16) NOT NULL,
          scope_key VARCHAR(128) NOT NULL,
          created_at BIGINT NOT NULL,
          INDEX idx_lookup (action, scope_type, scope_key, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    })();
  }

  await globalThis.__quickBasketOtpSchemaReady;
}

async function runInTransaction<T>(callback: (connection: PoolConnection) => Promise<T>) {
  await ensureSchema();

  const connection = await getPool().getConnection();

  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function hashOtp(phone: string, otp: string) {
  return createHash("sha256")
    .update(`${phone}:${otp}:${getOtpHashSecret()}`)
    .digest("hex");
}

function isMatchingOtp(phone: string, otp: string, otpHash: string) {
  const expectedHash = Buffer.from(otpHash, "hex");
  const actualHash = Buffer.from(hashOtp(phone, otp), "hex");

  return expectedHash.length === actualHash.length && timingSafeEqual(expectedHash, actualHash);
}

function generateOtp(length: number) {
  return Array.from({ length }, (_, index) => {
    const minDigit = index === 0 ? 1 : 0;
    return randomInt(minDigit, 10).toString();
  }).join("");
}

async function cleanupOtpState(now: number) {
  await ensureSchema();

  const pool = getPool();
  const tables = getTableNames();
  const retentionCutoff = now - 1000 * 60 * 60 * 24 * 7;
  const rateLimitCutoff = now - Math.max(getIpSendWindowMs(), getIpVerifyWindowMs(), getPhoneSendWindowMs(), getPhoneVerifyWindowMs()) * 2;

  await pool.query(`DELETE FROM ${tables.rateLimitEvents} WHERE created_at < ?`, [rateLimitCutoff]);
  await pool.query(
    `DELETE FROM ${tables.challenges}
     WHERE created_at < ?
       AND (expires_at < ? OR verified_at IS NOT NULL OR invalidated_at IS NOT NULL)`,
    [retentionCutoff, now]
  );
}

async function countRecentEvents(action: RateLimitAction, scopeType: RateLimitScopeType, scopeKey: string, windowStart: number) {
  await ensureSchema();

  const tables = getTableNames();
  const [rows] = await getPool().query<RecentEventCountRow[]>(
    `SELECT COUNT(*) AS count, MIN(created_at) AS oldest_created_at
     FROM ${tables.rateLimitEvents}
     WHERE action = ? AND scope_type = ? AND scope_key = ? AND created_at >= ?`,
    [action, scopeType, scopeKey, windowStart]
  );

  const row = rows[0];

  return {
    count: Number(row?.count ?? 0),
    oldestCreatedAt: row?.oldest_created_at ? Number(row.oldest_created_at) : null
  };
}

async function recordRateLimitEvent(
  connection: PoolConnection,
  action: RateLimitAction,
  scopeType: RateLimitScopeType,
  scopeKey: string,
  createdAt: number
) {
  const tables = getTableNames();

  await connection.query(
    `INSERT INTO ${tables.rateLimitEvents} (id, action, scope_type, scope_key, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [randomUUID(), action, scopeType, scopeKey, createdAt]
  );
}

export class OtpServiceError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status = 400, retryAfterSeconds?: number) {
    super(message);
    this.name = "OtpServiceError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

async function enforceRateLimit(rule: LimitRule, now: number) {
  const { count, oldestCreatedAt } = await countRecentEvents(rule.action, rule.scopeType, rule.scopeKey, now - rule.windowMs);

  if (count < rule.maxCount) {
    return;
  }

  const retryAfterMs = oldestCreatedAt ? Math.max(0, oldestCreatedAt + rule.windowMs - now) : rule.windowMs;
  throw new OtpServiceError(rule.errorMessage, 429, Math.ceil(retryAfterMs / 1000));
}

async function recordRateLimitEvents(
  connection: PoolConnection,
  action: RateLimitAction,
  phone: string,
  ipAddress: string | null,
  now: number
) {
  await recordRateLimitEvent(connection, action, "phone", phone, now);

  if (ipAddress) {
    await recordRateLimitEvent(connection, action, "ip", ipAddress, now);
  }
}

async function enforceSendRateLimits(phone: string, ipAddress: string | null, now: number) {
  await enforceRateLimit(
    {
      action: "send",
      scopeType: "phone",
      scopeKey: phone,
      maxCount: 1,
      windowMs: getSendCooldownMs(),
      errorMessage: "Please wait a few seconds before requesting another OTP."
    },
    now
  );

  await enforceRateLimit(
    {
      action: "send",
      scopeType: "phone",
      scopeKey: phone,
      maxCount: getPhoneSendLimit(),
      windowMs: getPhoneSendWindowMs(),
      errorMessage: "Too many OTP requests for this number. Please try again later."
    },
    now
  );

  if (ipAddress) {
    await enforceRateLimit(
      {
        action: "send",
        scopeType: "ip",
        scopeKey: ipAddress,
        maxCount: getIpSendLimit(),
        windowMs: getIpSendWindowMs(),
        errorMessage: "Too many OTP requests from this network. Please try again later."
      },
      now
    );
  }
}

async function enforceVerifyRateLimits(phone: string, ipAddress: string | null, now: number) {
  await enforceRateLimit(
    {
      action: "verify",
      scopeType: "phone",
      scopeKey: phone,
      maxCount: getPhoneVerifyLimit(),
      windowMs: getPhoneVerifyWindowMs(),
      errorMessage: "Too many OTP verification attempts. Please request a new OTP."
    },
    now
  );

  if (ipAddress) {
    await enforceRateLimit(
      {
        action: "verify",
        scopeType: "ip",
        scopeKey: ipAddress,
        maxCount: getIpVerifyLimit(),
        windowMs: getIpVerifyWindowMs(),
        errorMessage: "Too many OTP verification attempts from this network. Please try again later."
      },
      now
    );
  }
}

async function invalidateOutstandingChallenges(connection: PoolConnection, phone: string, now: number) {
  const tables = getTableNames();

  await connection.query(
    `UPDATE ${tables.challenges}
     SET invalidated_at = ?
     WHERE phone = ?
       AND verified_at IS NULL
       AND invalidated_at IS NULL
       AND expires_at >= ?`,
    [now, phone, now]
  );
}

async function getActiveChallenge(requestId: string, phone: string) {
  await ensureSchema();

  const tables = getTableNames();
  const [rows] = await getPool().query<OtpChallengeRecord[]>(
    `SELECT id, phone, name, otp_hash, otp_length, expires_at, created_at, sent_at, verified_at, invalidated_at,
            verify_attempt_count, max_verify_attempts
     FROM ${tables.challenges}
     WHERE id = ? AND phone = ?
     LIMIT 1`,
    [requestId, phone]
  );

  return rows[0];
}

async function insertChallenge(
  connection: PoolConnection,
  record: {
    id: string;
    phone: string;
    name: string;
    otpHash: string;
    otpLength: number;
    expiresAt: number;
    createdAt: number;
    sentAt: number;
    ipAddress: string | null;
    userAgent: string | null;
  }
) {
  const tables = getTableNames();

  await connection.query(
    `INSERT INTO ${tables.challenges} (
      id, phone, name, otp_hash, otp_length, expires_at, created_at, sent_at,
      verify_attempt_count, max_verify_attempts, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    [
      record.id,
      record.phone,
      record.name,
      record.otpHash,
      record.otpLength,
      record.expiresAt,
      record.createdAt,
      record.sentAt,
      getMaxVerifyAttempts(),
      record.ipAddress,
      record.userAgent
    ]
  );
}

async function incrementChallengeAttempts(connection: PoolConnection, challengeId: string) {
  const tables = getTableNames();

  await connection.query(
    `UPDATE ${tables.challenges}
     SET verify_attempt_count = verify_attempt_count + 1
     WHERE id = ?`,
    [challengeId]
  );
}

async function markChallengeInvalidated(connection: PoolConnection, challengeId: string, now: number) {
  const tables = getTableNames();

  await connection.query(
    `UPDATE ${tables.challenges}
     SET invalidated_at = COALESCE(invalidated_at, ?)
     WHERE id = ?`,
    [now, challengeId]
  );
}

async function markChallengeVerified(connection: PoolConnection, challengeId: string, now: number) {
  const tables = getTableNames();

  await connection.query(
    `UPDATE ${tables.challenges}
     SET verified_at = ?, invalidated_at = NULL
     WHERE id = ?`,
    [now, challengeId]
  );
}

function buildGatewayUrl(otp: string, phone: string) {
  const gatewayUrl = process.env.SMS_GATEWAY_URL?.trim();
  const authKey = process.env.SMS_AUTH_KEY?.trim();
  const senderId = process.env.SMS_SENDER_ID?.trim();
  const routeId = process.env.SMS_ROUTE_ID?.trim();
  const contentType = process.env.SMS_CONTENT_TYPE?.trim() || "english";
  const template =
    process.env.SMS_OTP_MESSAGE_TEMPLATE?.trim() ||
    "{otp} is your One-Time Password to login to your Gupta Watches account, valid for only 2 minutes. Please do not share with anyone.";

  if (!gatewayUrl || !authKey || !senderId || !routeId) {
    throw new OtpServiceError("SMS gateway is not configured on the server.", 500);
  }

  const message = template
    .replaceAll("{otp}", otp)
    .replaceAll("{ttl_minutes}", Math.ceil(getOtpTtlMs() / 60000).toString());

  const params = new URLSearchParams({
    AUTH_KEY: authKey,
    message,
    senderId,
    routeId,
    mobileNos: phone,
    smsContentType: contentType
  });

  return `${gatewayUrl}?${params.toString()}`;
}

async function sendOtpMessage(phone: string, otp: string) {
  const response = await fetch(buildGatewayUrl(otp, phone), {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new OtpServiceError("We could not send the OTP right now. Please try again.", 502);
  }
}

export async function sendOtpChallenge(input: SendOtpInput): Promise<SendOtpResult> {
  const now = Date.now();
  const otpLength = getOtpLength();

  await cleanupOtpState(now);
  await enforceSendRateLimits(input.phone, input.ipAddress, now);

  const requestId = randomUUID();
  const otp = generateOtp(otpLength);
  const expiresAt = now + getOtpTtlMs();

  await sendOtpMessage(input.phone, otp);

  await runInTransaction(async (connection) => {
    await invalidateOutstandingChallenges(connection, input.phone, now);
    await insertChallenge(connection, {
      id: requestId,
      phone: input.phone,
      name: input.name,
      otpHash: hashOtp(input.phone, otp),
      otpLength,
      expiresAt,
      createdAt: now,
      sentAt: now,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    });
    await recordRateLimitEvents(connection, "send", input.phone, input.ipAddress, now);
  });

  return {
    requestId,
    expiresAt: new Date(expiresAt).toISOString(),
    resendAvailableAt: new Date(now + getSendCooldownMs()).toISOString(),
    otpLength
  };
}

export async function verifyOtpChallenge(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  const now = Date.now();

  await cleanupOtpState(now);
  await enforceVerifyRateLimits(input.phone, input.ipAddress, now);

  const challenge = await getActiveChallenge(input.requestId, input.phone);

  await runInTransaction(async (connection) => {
    await recordRateLimitEvents(connection, "verify", input.phone, input.ipAddress, now);
  });

  if (!challenge) {
    throw new OtpServiceError("This OTP request was not found. Please request a new OTP.", 404);
  }

  if (challenge.verified_at) {
    throw new OtpServiceError("This OTP has already been used. Please request a new OTP.", 409);
  }

  if (challenge.invalidated_at) {
    throw new OtpServiceError("This OTP is no longer valid. Please request a new OTP.", 410);
  }

  if (challenge.expires_at < now) {
    await runInTransaction(async (connection) => {
      await markChallengeInvalidated(connection, challenge.id, now);
    });

    throw new OtpServiceError("This OTP has expired. Please request a new OTP.", 410);
  }

  if (!isMatchingOtp(input.phone, input.otp, challenge.otp_hash)) {
    const nextAttemptCount = challenge.verify_attempt_count + 1;

    await runInTransaction(async (connection) => {
      await incrementChallengeAttempts(connection, challenge.id);

      if (nextAttemptCount >= challenge.max_verify_attempts) {
        await markChallengeInvalidated(connection, challenge.id, now);
      }
    });

    if (nextAttemptCount >= challenge.max_verify_attempts) {
      throw new OtpServiceError("Too many incorrect OTP attempts. Please request a new OTP.", 429);
    }

    throw new OtpServiceError("Invalid OTP.", 401);
  }

  await runInTransaction(async (connection) => {
    await markChallengeVerified(connection, challenge.id, now);
    await invalidateOutstandingChallenges(connection, input.phone, now);
  });

  return {
    name: challenge.name,
    phone: challenge.phone
  };
}
