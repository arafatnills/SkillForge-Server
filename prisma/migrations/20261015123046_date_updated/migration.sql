/*
  Warnings:

  - The `deletedAt` column on the `schedules` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "schedules" DROP COLUMN "deletedAt",
ADD COLUMN     "deletedAt" TIMESTAMP(3);
