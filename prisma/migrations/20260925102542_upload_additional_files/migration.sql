/*
  Warnings:

  - The `additionFiles` column on the `mentors` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "mentors" ADD COLUMN     "resumePublicId" TEXT,
DROP COLUMN "additionFiles",
ADD COLUMN     "additionFiles" JSONB;
