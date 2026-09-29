-- CreateEnum
CREATE TYPE "MentorApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "mentor_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "expertise" TEXT,
    "experienceYears" INTEGER NOT NULL,
    "resume" TEXT,
    "resumePublicId" TEXT,
    "additionalFiles" JSONB,
    "bio" TEXT,
    "appointmentFee" DECIMAL(10,2),
    "status" "MentorApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "mentor_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mentor_applications_userId_key" ON "mentor_applications"("userId");

-- CreateIndex
CREATE INDEX "mentor_applications_userId_idx" ON "mentor_applications"("userId");

-- CreateIndex
CREATE INDEX "mentor_applications_status_idx" ON "mentor_applications"("status");

-- AddForeignKey
ALTER TABLE "mentor_applications" ADD CONSTRAINT "mentor_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
