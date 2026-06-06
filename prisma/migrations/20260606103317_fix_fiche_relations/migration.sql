/*
  Warnings:

  - You are about to drop the column `seanceId` on the `Fiche` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "Fiche" DROP CONSTRAINT "Fiche_userId_fkey";

-- AlterTable
ALTER TABLE "Fiche" DROP COLUMN "seanceId",
ADD COLUMN     "seanceSourceId" TEXT;

-- AddForeignKey
ALTER TABLE "Fiche" ADD CONSTRAINT "Fiche_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
