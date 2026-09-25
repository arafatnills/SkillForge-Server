/*
  Warnings:

  - You are about to drop the column `needsPassword` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "needsPassword",
ADD COLUMN     "needsPasswordChange" BOOLEAN NOT NULL DEFAULT false;
