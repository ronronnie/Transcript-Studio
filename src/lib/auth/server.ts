import "server-only";

import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  type Session,
  verifySessionToken,
} from "./session";

/**
 * Read and verify the current session in Server Components / Route Handlers.
 * Returns null when there is no valid session. Uses next/headers, so this is
 * NOT importable from the Edge proxy — proxy.ts reads the cookie off the
 * request directly. See ./session.ts for the (runtime-agnostic) crypto.
 */
export async function getSession(): Promise<Session | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token, secret);
}
