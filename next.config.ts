import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets e2e runs use their own build output alongside a running `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
