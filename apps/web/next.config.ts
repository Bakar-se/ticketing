import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Emit a self-contained server (.next/standalone) for the Docker image
  output: "standalone",
  // node_modules is hoisted to the repo root, so file tracing must start there
  outputFileTracingRoot: path.join(process.cwd(), "../.."),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
