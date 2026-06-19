import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

/**
 * Server-side Drizzle client backed by the Neon serverless (HTTP) driver.
 *
 * This module imports "server-only", so any attempt to import it from a Client
 * Component is a build error. The browser never talks to Postgres directly —
 * all database access flows through this client via server code (API routes /
 * server actions) and the data layer in `./index.ts`.
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.local.example to .env.local and add your Neon connection string."
  );
}

const sql = neon(databaseUrl);

export const db = drizzle({ client: sql, schema });

export { schema };
