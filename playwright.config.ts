import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  // Tests share one seeded database and some of them write to it.
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Fresh seeded database on every server start.
    command: `rm -f data/e2e.db data/e2e.db-wal data/e2e.db-shm && npm run db:seed && npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    // Keep e2e runs away from the real campaign database.
    env: { CODEX_DB_PATH: "data/e2e.db", NEXT_DIST_DIR: ".next-e2e" },
  },
});
