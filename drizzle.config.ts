import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so it does not auto-load .env.local.
// Load it explicitly here so `drizzle-kit generate/migrate` see DATABASE_URL.
config({ path: ".env.local" });

// `generate` only reads the schema and needs no connection, so we don't throw
// here. Commands that connect (migrate/push/studio) will fail with their own
// error if DATABASE_URL is missing — add it to .env.local before running them.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
