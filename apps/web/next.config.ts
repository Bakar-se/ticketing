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
  // Proxy auth calls so the browser only ever talks to the web origin.
  // The destination is read at BUILD time (see below).
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: `${process.env.AUTH_URL ?? "http://localhost:3001"}/api/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
