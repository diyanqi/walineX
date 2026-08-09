import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { sendQueuedEmail, type QueuedEmailJob } from "@/lib/notifications";

try {
  process.loadEnvFile?.(".env");
} catch {
  // Env vars are already set when the worker runs in Docker.
}

async function main(): Promise<void> {
  if (process.env.REDIS_ENABLED !== "true") {
    console.log("Email worker is disabled because REDIS_ENABLED is not true.");
    return;
  }

  const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  });
  const worker = new Worker<QueuedEmailJob>(
    "walinex-emails",
    async (job) => {
      await sendQueuedEmail(job.data);
    },
    {
      connection,
      concurrency: Number(process.env.EMAIL_WORKER_CONCURRENCY || "4"),
    },
  );

  worker.on("completed", (job) => {
    console.log(`Email job ${job.id} sent to ${job.data.to}`);
  });
  worker.on("failed", (job, error) => {
    console.error(`Email job ${job?.id} failed:`, error.message);
  });

  await worker.waitUntilReady();
  console.log("Email worker is listening on walinex-emails.");

  const shutdown = async (): Promise<void> => {
    console.log("Shutting down email worker...");
    await worker.close();
    await connection.quit();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error("Email worker failed to start:", error);
  process.exit(1);
});
