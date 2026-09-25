/*
  Warnings:

  - You are about to drop the column `experience` on the `mentors` table. All the data in the column will be lost.
  - Added the required column `experienceYears` to the `mentors` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MentorVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "mentors" DROP COLUMN "experience",
ADD COLUMN     "additionFiles" TEXT[],
ADD COLUMN     "appointmentFee" DECIMAL(10,2),
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "experienceYears" INTEGER NOT NULL,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "resume" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedBy" TEXT,
ADD COLUMN     "verificationStatus" "MentorVerificationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "idx_mentor_email" ON "mentors"("email");

-- CreateIndex
CREATE INDEX "idx_mentor_isDeleted" ON "mentors"("isDeleted");
