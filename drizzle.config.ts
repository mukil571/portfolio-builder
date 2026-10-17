import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Load environment variables from .env.local (Next.js convention) and .env
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
