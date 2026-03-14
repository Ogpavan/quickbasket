import "server-only";

import { createHmac } from "node:crypto";

interface AuthTokenPayload {
  sub: number;
  phone: string;
  exp: number;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

function getAuthSecret() {
  return (
    process.env.AUTH_TOKEN_SECRET?.trim() ||
    process.env.OTP_HASH_SECRET?.trim() ||
    process.env.SMS_AUTH_KEY?.trim() ||
    "quickbasket-auth-secret"
  );
}

function base64UrlEncode(input: string | Buffer) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return buffer
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(input: string) {
  const padded = input.replaceAll("-", "+").replaceAll("_", "/");
  const padding = "=".repeat((4 - (padded.length % 4)) % 4);
  return Buffer.from(padded + padding, "base64").toString("utf8");
}

export function createAuthToken(userId: number, phone: string, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const payload: AuthTokenPayload = {
    sub: userId,
    phone,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", getAuthSecret()).update(encodedPayload).digest();

  return `${encodedPayload}.${base64UrlEncode(signature)}`;
}

export function verifyAuthToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = base64UrlEncode(
    createHmac("sha256", getAuthSecret()).update(encodedPayload).digest()
  );

  if (expectedSignature !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;
    if (!payload.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
