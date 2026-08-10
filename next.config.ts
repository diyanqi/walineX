import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // QEMU emulation for linux/arm64 can SIGILL inside Next's forked build worker.
    webpackBuildWorker: false,
  },
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
