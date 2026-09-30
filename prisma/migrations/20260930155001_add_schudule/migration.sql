/*
  Warnings:

  - A unique constraint covering the columns `[learnerId,mentorId,scheduleId]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduleId,serialNumber,joiningTime]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `joiningTime` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `learnerId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mentorId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduleId` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serialNumber` to the `appointments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "homeWorkPublicId" TEXT,
ADD COLUMN     "homeWorkUrl" TEXT,
ADD COLUMN     "joiningTime" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "learnerId" TEXT NOT NULL,
ADD COLUMN     "mentorId" TEXT NOT NULL,
ADD COLUMN     "previousHomeWorkPublicId" TEXT,
ADD COLUMN     "previousHomeWorkUrl" TEXT,
ADD COLUMN     "scheduleId" TEXT NOT NULL,
ADD COLUMN     "serialNumber" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "startDateTime" TIMESTAMP(3) NOT NULL,
    "endDateTime" TIMESTAMP(3) NOT NULL,
    "totalSlots" INTEGER NOT NULL,
    "availableSlots" INTEGER NOT NULL,
    "meetingLink" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mentorId" TEXT NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schedules_mentorId_startDateTime_endDateTime_key" ON "schedules"("mentorId", "startDateTime", "endDateTime");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_learnerId_mentorId_scheduleId_key" ON "appointments"("learnerId", "mentorId", "scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_scheduleId_serialNumber_joiningTime_key" ON "appointments"("scheduleId", "serialNumber", "joiningTime");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "mentors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "mentors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
