import { NextResponse } from "next/server";

import {
  constantTimeEqual,
  createSessionToken,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/auth/session";

/**
 * Sign-in endpoint for the single fixed user.
 *
 * Credentials live in env (APP_USERNAME / APP_PASSWORD) and are compared
 * server-side only — the password is never sent to the client. On success we
 * set a signed, HTTP-only session cookie (signed with AUTH_SECRET).
 *
 * INTENTIONALLY a single fixed user (portfolio MVP, not production auth).
 * To harden later: move users to the database with per-user hashed passwords
 * (e.g. bcrypt/argon2), and replace the in-memory rate limiter below with a
 * shared store (Redis/Postgres) so it survives restarts and works across
 * multiple instances.
 */

// Simple in-memory brute-force guard. Resets on restart and is per-instance
// only — fine for a single-instance MVP; see note above to harden.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; first: number }>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "local";
}

export async function POST(request: Request) {
  const expectedUsername = process.env.APP_USERNAME;
  const expectedPassword = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!expectedUsername || !expectedPassword || !secret) {
    return NextResponse.json(
      { error: "Sign-in is not configured on the server." },
      { status: 500 }
    );
  }

  const key = clientKey(request);
  const now = Date.now();
  const record = attempts.get(key);
  const withinWindow = record && now - record.first < WINDOW_MS;

  if (withinWindow && record!.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let username = "";
  let password = "";
  try {
    const body = await request.json();
    if (typeof body?.username === "string") username = body.username;
    if (typeof body?.password === "string") password = body.password;
  } catch {
    // fall through to the invalid-credentials path
  }

  const valid =
    constantTimeEqual(username, expectedUsername) &&
    constantTimeEqual(password, expectedPassword);

  if (!valid) {
    const base = withinWindow ? record! : { count: 0, first: now };
    base.count += 1;
    attempts.set(key, base);
    // Small fixed delay to slow down automated guessing.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 }
    );
  }

  attempts.delete(key);

  const token = await createSessionToken(expectedUsername, secret);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}
