import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema",
  out: "./drizzle",
  dbCredentials: { url: process.env.CODEX_DB_PATH ?? "data/codex.db" },
});
