-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "objectId" SERIAL NOT NULL;
ALTER TABLE "User" ADD COLUMN     "url" TEXT;

-- CreateIndex
CREATE INDEX "Comment_instanceId_userId_idx" ON "Comment"("instanceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_objectId_key" ON "User"("objectId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
