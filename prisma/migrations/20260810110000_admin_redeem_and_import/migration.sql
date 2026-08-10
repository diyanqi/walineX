-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "importId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Comment_instanceId_importId_key" ON "Comment"("instanceId", "importId");

-- CreateTable
CREATE TABLE "RedeemCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "plan" "Plan" NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "maxUses" INTEGER NOT NULL DEFAULT 1,
  "usedCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "RedeemCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedemptionUsage" (
  "id" TEXT NOT NULL,
  "codeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RedemptionUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RedeemCode_code_key" ON "RedeemCode"("code");

-- CreateIndex
CREATE INDEX "RedeemCode_createdBy_idx" ON "RedeemCode"("createdBy");

-- CreateIndex
CREATE INDEX "RedeemCode_expiresAt_idx" ON "RedeemCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedemptionUsage_codeId_userId_key" ON "RedemptionUsage"("codeId", "userId");

-- CreateIndex
CREATE INDEX "RedemptionUsage_userId_idx" ON "RedemptionUsage"("userId");

-- AddForeignKey
ALTER TABLE "RedeemCode" ADD CONSTRAINT "RedeemCode_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionUsage" ADD CONSTRAINT "RedemptionUsage_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "RedeemCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RedemptionUsage" ADD CONSTRAINT "RedemptionUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
