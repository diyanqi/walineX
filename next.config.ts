import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/adapter-pg",
    "@prisma/client",
    "capjs-core",
    "esbuild",
    "ioredis",
    "pg",
    "sanitize-html",
  ],
};

export default nextConfig;
