import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const attempts = Number(process.env.DB_WAIT_ATTEMPTS || "30");
const delayMs = Number(process.env.DB_WAIT_DELAY_MS || "2000");

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const client = new Client({ connectionString: databaseUrl, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
    await client.end();
    console.log("Database is ready");
    process.exit(0);
  } catch (error) {
    console.warn(`Database not ready (${attempt}/${attempts}): ${error?.message || error}`);
    await client.end().catch(() => {});
    if (attempt < attempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

console.error("Database did not become ready in time");
process.exit(1);
