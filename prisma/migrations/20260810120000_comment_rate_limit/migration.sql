-- AlterTable
ALTER TABLE "Instance"
  ADD COLUMN "commentRateLimitMax" INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN "commentRateLimitWindowSec" INTEGER NOT NULL DEFAULT 60;
