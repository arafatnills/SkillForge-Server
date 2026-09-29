/*
  Warnings:

  - You are about to drop the column `status` on the `mentor_applications` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `mentor_applications` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "MentorVerificationStatus" ADD VALUE 'OTP_PENDING';

-- DropIndex
DROP INDEX "mentor_applications_status_idx";

-- AlterTable
ALTER TABLE "mentor_applications" DROP COLUMN "status",
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "verificationStatus" "MentorVerificationStatus" NOT NULL DEFAULT 'PENDING';

-- DropEnum
DROP TYPE "MentorApplicationStatus";

-- CreateIndex
CREATE UNIQUE INDEX "mentor_applications_email_key" ON "mentor_applications"("email");

-- CreateIndex
CREATE INDEX "mentor_applications_verificationStatus_idx" ON "mentor_applications"("verificationStatus");
