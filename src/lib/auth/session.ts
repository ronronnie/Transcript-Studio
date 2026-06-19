/**
 * Session cookie signing/verification.
 *
 * Uses the Web Crypto API (HMAC-SHA256) so this module is safe to import from
 * the Edge runtime (proxy.ts) as well as Node route handlers and Server
 * Components. It deliberately avoids `node:crypto` and `next/headers` for that
 * reason — keep it dependency-free and runtime-agnostic.
 *
 * The token format is `base64url(payload).base64url(hmac(payload))`. The
 * payload is small JSON ({ username, iat }); the HMAC, keyed with AUTH_SECRET,
 * makes the cookie tamper-evident. This is intentionally minimal MVP auth (a
 * single fixed user — see /api/login). To harden later: add an expiry check
 * (`iat`/`exp`), rotate AUTH_SECRET, and consider a server-side session store.
 */

export const SESSION_COOKIE_NAME = "ts_session";

// 7 days, in seconds.
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface Session {
  username: string;
  /** Issued-at, ms since epoch. */
  iat: number;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded =
    value.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return new Uint8Array(signature);
}

/** Constant-time string comparison (avoids leaking length-prefix via timing). */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function createSessionToken(
  username: string,
  secret: string
): Promise<string> {
  const payload = JSON.stringify({
    username,
    iat: Date.now(),
  } satisfies Session);
  const payloadB64 = toBase64Url(encoder.encode(payload));
  const signature = toBase64Url(await hmac(secret, payloadB64));
  return `${payloadB64}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<Session | null> {
  if (!token) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = toBase64Url(await hmac(secret, payloadB64));
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    const data = JSON.parse(json) as Partial<Session>;
    if (typeof data.username !== "string" || typeof data.iat !== "number") {
      return null;
    }
    return { username: data.username, iat: data.iat };
  } catch {
    return null;
  }
}
