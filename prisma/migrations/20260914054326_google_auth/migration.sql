-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE', 'CREDENTIAL');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIAL';
