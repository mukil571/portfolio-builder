import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var _postgresClient: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL || "";

/**
 * Configure postgres client for serverless deployment.
 *
 * - `prepare: false` is required when connecting via transaction-mode poolers
 *   (e.g., PgBouncer, Neon pooled connection string) which do not support prepared statements.
 * - Global client caching prevents multiple connection pools during development hot reloads.
 */
const client =
  globalThis._postgresClient ??
  postgres(connectionString, {
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._postgresClient = client;
}

export const db = drizzle(client, { schema });
