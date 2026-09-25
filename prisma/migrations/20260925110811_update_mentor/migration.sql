/*
  Warnings:

  - You are about to drop the column `additionFiles` on the `mentors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "mentors" DROP COLUMN "additionFiles",
ADD COLUMN     "additionalFiles" JSONB;
