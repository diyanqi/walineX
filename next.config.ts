import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/adapter-pg",
    "@prisma/client",
    "bullmq",
    "capjs-core",
    "esbuild",
    "ioredis",
    "nodemailer",
    "pg",
    "sanitize-html",
  ],
};

export default nextConfig;
