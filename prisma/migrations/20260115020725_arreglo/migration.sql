/*
  Warnings:

  - You are about to drop the column `positionId` on the `Vote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,electionId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_positionId_fkey";

-- DropIndex
DROP INDEX "Vote_positionId_idx";

-- DropIndex
DROP INDEX "Vote_userId_electionId_positionId_key";

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "positionId";

-- CreateIndex
CREATE UNIQUE INDEX "Vote_userId_electionId_key" ON "Vote"("userId", "electionId");
