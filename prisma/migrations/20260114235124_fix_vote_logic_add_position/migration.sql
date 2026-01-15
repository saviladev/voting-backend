/*
  Warnings:

  - A unique constraint covering the columns `[userId,electionId,positionId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `positionId` to the `Vote` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Vote_userId_electionId_key";

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "positionId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Vote_positionId_idx" ON "Vote"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_electionId_positionId_key" ON "Vote"("userId", "electionId", "positionId");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "ElectionPosition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
