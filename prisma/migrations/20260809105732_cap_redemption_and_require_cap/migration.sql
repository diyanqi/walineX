-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "requireCap" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CapRedemption" (
    "id" TEXT NOT NULL,
    "tokenKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapRedemption_tokenKey_key" ON "CapRedemption"("tokenKey");

-- CreateIndex
CREATE INDEX "CapRedemption_expiresAt_idx" ON "CapRedemption"("expiresAt");

-- CreateIndex
CREATE INDEX "CapRedemption_consumedAt_idx" ON "CapRedemption"("consumedAt");
