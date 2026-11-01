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
  // Destinations are compiled into the routes manifest at `next build`.
  async rewrites() {
    const auth = process.env.AUTH_INTERNAL_URL ?? "http://localhost:4001";
    const api = process.env.API_INTERNAL_URL ?? "http://localhost:4000";
    return [
      { source: "/api/auth/:path*", destination: `${auth}/api/auth/:path*` },
      { source: "/backend/:path*", destination: `${api}/:path*` },
    ];
  },
};

export default nextConfig;
