-- AlterTable
ALTER TABLE "Instance" ADD COLUMN "targetOrigins" TEXT[] NOT NULL DEFAULT '{}';
