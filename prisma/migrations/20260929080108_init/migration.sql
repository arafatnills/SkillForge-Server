/*
  Warnings:

  - You are about to drop the `mentor_applications` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "mentor_applications" DROP CONSTRAINT "mentor_applications_userId_fkey";

-- DropTable
DROP TABLE "mentor_applications";
