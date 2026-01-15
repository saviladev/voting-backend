/*
  Warnings:

  - A unique constraint covering the columns `[userId,electionPositionId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `electionPositionId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Vote_userId_electionId_key";

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "electionPositionId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Vote_electionPositionId_idx" ON "Vote"("electionPositionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_electionPositionId_key" ON "Vote"("userId", "electionPositionId");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_electionPositionId_fkey" FOREIGN KEY ("electionPositionId") REFERENCES "ElectionPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
