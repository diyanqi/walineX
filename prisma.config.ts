import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile?.(".env");
} catch {
  // .env is optional in production where environment variables are injected.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
