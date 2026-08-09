-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('free', 'starter', 'pro');

-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('manual', 'stripe', 'lemon', 'paddle');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'expired');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('github', 'google');

-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('active', 'disabled', 'suspended');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('approved', 'waiting', 'spam');

-- CreateEnum
CREATE TYPE "SensitiveWordScope" AS ENUM ('global', 'instance');

-- CreateEnum
CREATE TYPE "SensitiveWordAction" AS ENUM ('block', 'replace', 'review');

-- CreateEnum
CREATE TYPE "ModerationRuleType" AS ENUM ('ip_blacklist', 'user_blacklist', 'email_blacklist', 'url_blacklist', 'nick_blacklist');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('new_comment', 'reply', 'moderation');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('pending', 'sent', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "EmailLogStatus" AS ENUM ('queued', 'sent', 'failed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "avatar" TEXT,
    "passwordHash" TEXT,
    "githubId" TEXT,
    "googleId" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'free',
    "planExpiresAt" TIMESTAMP(3),
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "avatar" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instance" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "status" "InstanceStatus" NOT NULL DEFAULT 'active',
    "moderationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sensitiveWordMode" "SensitiveWordAction" NOT NULL DEFAULT 'review',
    "defaultCommentStatus" "CommentStatus" NOT NULL DEFAULT 'waiting',
    "notifyNewComment" BOOLEAN NOT NULL DEFAULT false,
    "notifyReply" BOOLEAN NOT NULL DEFAULT false,
    "notifyModeration" BOOLEAN NOT NULL DEFAULT false,
    "notificationEmail" TEXT,
    "akismetEnabled" BOOLEAN NOT NULL DEFAULT false,
    "akismetKeyEncrypted" TEXT,
    "aiModerationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiApiBaseUrl" TEXT,
    "aiApiKeyEncrypted" TEXT,
    "aiModel" TEXT,
    "allowAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "monthlyCommentLimit" INTEGER NOT NULL DEFAULT 1000,
    "totalCommentLimit" INTEGER NOT NULL DEFAULT 10000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Instance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "objectId" SERIAL NOT NULL,
    "instanceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nick" TEXT NOT NULL,
    "mail" TEXT,
    "link" TEXT,
    "avatar" TEXT,
    "comment" TEXT NOT NULL,
    "rendered" TEXT NOT NULL,
    "ua" TEXT,
    "ipHash" TEXT,
    "ip" TEXT,
    "addr" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "status" "CommentStatus" NOT NULL DEFAULT 'waiting',
    "like" INTEGER NOT NULL DEFAULT 0,
    "sticky" BOOLEAN NOT NULL DEFAULT false,
    "pid" INTEGER,
    "rid" INTEGER,
    "at" TEXT,
    "spamScore" DOUBLE PRECISION,
    "moderationReason" TEXT,
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("objectId")
);

-- CreateTable
CREATE TABLE "CommentReply" (
    "id" TEXT NOT NULL,
    "commentId" INTEGER NOT NULL,
    "replyToCommentId" INTEGER NOT NULL,
    "userId" TEXT,
    "nick" TEXT NOT NULL,
    "email" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "reaction" TEXT NOT NULL DEFAULT 'like',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensitiveWord" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT,
    "scope" "SensitiveWordScope" NOT NULL DEFAULT 'instance',
    "word" TEXT NOT NULL,
    "action" "SensitiveWordAction" NOT NULL DEFAULT 'review',
    "replacement" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SensitiveWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationRule" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" "ModerationRuleType" NOT NULL,
    "value" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'pending',
    "commentId" INTEGER,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "instanceId" TEXT,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailLogStatus" NOT NULL DEFAULT 'queued',
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" "Plan" NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL DEFAULT 'manual',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "externalId" TEXT,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCounter" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapNonce" (
    "id" TEXT NOT NULL,
    "sig" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapNonce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_userId_provider_key" ON "Account"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Instance_slug_key" ON "Instance"("slug");

-- CreateIndex
CREATE INDEX "Instance_userId_idx" ON "Instance"("userId");

-- CreateIndex
CREATE INDEX "Instance_status_idx" ON "Instance"("status");

-- CreateIndex
CREATE INDEX "Comment_instanceId_status_createdAt_idx" ON "Comment"("instanceId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_instanceId_url_status_createdAt_idx" ON "Comment"("instanceId", "url", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_instanceId_pid_idx" ON "Comment"("instanceId", "pid");

-- CreateIndex
CREATE INDEX "Comment_instanceId_rid_idx" ON "Comment"("instanceId", "rid");

-- CreateIndex
CREATE INDEX "Comment_instanceId_deletedAt_idx" ON "Comment"("instanceId", "deletedAt");

-- CreateIndex
CREATE INDEX "CommentReply_commentId_idx" ON "CommentReply"("commentId");

-- CreateIndex
CREATE INDEX "CommentReply_replyToCommentId_idx" ON "CommentReply"("replyToCommentId");

-- CreateIndex
CREATE INDEX "CommentReaction_commentId_idx" ON "CommentReaction"("commentId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReaction_commentId_key_reaction_key" ON "CommentReaction"("commentId", "key", "reaction");

-- CreateIndex
CREATE INDEX "SensitiveWord_instanceId_word_idx" ON "SensitiveWord"("instanceId", "word");

-- CreateIndex
CREATE INDEX "ModerationRule_instanceId_type_idx" ON "ModerationRule"("instanceId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ModerationRule_instanceId_type_value_key" ON "ModerationRule"("instanceId", "type", "value");

-- CreateIndex
CREATE INDEX "Notification_instanceId_status_idx" ON "Notification"("instanceId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_status_createdAt_idx" ON "EmailLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_instanceId_idx" ON "EmailLog"("instanceId");

-- CreateIndex
CREATE INDEX "UsageRecord_userId_month_idx" ON "UsageRecord"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_instanceId_month_key" ON "UsageRecord"("instanceId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_userId_month_key" ON "UsageRecord"("userId", "month");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_plan_provider_status_key" ON "Subscription"("userId", "plan", "provider", "status");

-- CreateIndex
CREATE INDEX "ArticleCounter_instanceId_url_idx" ON "ArticleCounter"("instanceId", "url");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCounter_instanceId_url_type_key" ON "ArticleCounter"("instanceId", "url", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CapNonce_sig_key" ON "CapNonce"("sig");

-- CreateIndex
CREATE INDEX "CapNonce_expiresAt_idx" ON "CapNonce"("expiresAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_pid_fkey" FOREIGN KEY ("pid") REFERENCES "Comment"("objectId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_rid_fkey" FOREIGN KEY ("rid") REFERENCES "Comment"("objectId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("objectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_replyToCommentId_fkey" FOREIGN KEY ("replyToCommentId") REFERENCES "Comment"("objectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReply" ADD CONSTRAINT "CommentReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("objectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensitiveWord" ADD CONSTRAINT "SensitiveWord_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRule" ADD CONSTRAINT "ModerationRule_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("objectId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCounter" ADD CONSTRAINT "ArticleCounter_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
