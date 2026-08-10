-- AlterTable
ALTER TABLE "Instance" ALTER COLUMN "defaultCommentStatus" SET DEFAULT 'approved';

-- Existing instances with moderation disabled publish new comments directly.
UPDATE "Instance"
SET "defaultCommentStatus" = 'approved'
WHERE "moderationEnabled" = false;
