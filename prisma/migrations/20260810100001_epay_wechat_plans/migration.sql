-- AlterTable
ALTER TABLE "Instance"
  ADD COLUMN "wechatNotificationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wechatBotTokenEncrypted" TEXT,
  ADD COLUMN "wechatBotId" TEXT,
  ADD COLUMN "wechatBaseUrl" TEXT,
  ADD COLUMN "wechatUserId" TEXT;

-- AlterTable
ALTER TABLE "Notification"
  ALTER COLUMN "recipientEmail" DROP NOT NULL,
  ADD COLUMN "recipientWechatId" TEXT,
  ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'wechat';

-- CreateTable
CREATE TYPE "PaymentOrderStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'expired');

CREATE TABLE "PaymentOrder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "plan" "Plan" NOT NULL,
  "period" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "provider" "SubscriptionProvider" NOT NULL DEFAULT 'epay',
  "outTradeNo" TEXT NOT NULL,
  "externalTradeNo" TEXT,
  "status" "PaymentOrderStatus" NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOrder_outTradeNo_key" ON "PaymentOrder"("outTradeNo");

-- CreateIndex
CREATE INDEX "PaymentOrder_userId_status_idx" ON "PaymentOrder"("userId", "status");

-- CreateIndex
CREATE INDEX "PaymentOrder_status_createdAt_idx" ON "PaymentOrder"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentOrder" ADD CONSTRAINT "PaymentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Align existing free instances with the new free plan limits.
UPDATE "Instance"
SET "monthlyCommentLimit" = 1000, "totalCommentLimit" = 5000
WHERE "userId" IN (SELECT "id" FROM "User" WHERE "plan" = 'free');
