-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterEnum
ALTER TYPE "ResourceType" ADD VALUE 'PPT';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "password" TEXT,
ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN "university" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "batch" TEXT;

-- AlterTable
ALTER TABLE "Resource"
ADD COLUMN "university" TEXT,
ADD COLUMN "department" TEXT,
ADD COLUMN "batch" TEXT,
ADD COLUMN "semester" INTEGER,
ADD COLUMN "subjectId" TEXT,
ADD COLUMN "extractedText" TEXT;

-- CreateTable
CREATE TABLE "DepartmentConfig" (
	"id" TEXT NOT NULL,
	"code" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"description" TEXT,
	"university" TEXT NOT NULL,
	"isActive" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "DepartmentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchConfig" (
	"id" TEXT NOT NULL,
	"code" TEXT NOT NULL,
	"years" TEXT NOT NULL,
	"university" TEXT NOT NULL,
	"departmentId" TEXT NOT NULL,
	"isActive" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "BatchConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"code" TEXT NOT NULL,
	"department" TEXT,
	"departmentId" TEXT,
	"batchId" TEXT,
	"semester" INTEGER NOT NULL,
	"university" TEXT NOT NULL,
	"isActive" BOOLEAN NOT NULL DEFAULT true,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,

	CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "ResourceChunk" (
	"id" TEXT NOT NULL,
	"resourceId" TEXT NOT NULL,
	"content" TEXT NOT NULL,
	"embedding" vector(1536),
	"chunkIndex" INTEGER NOT NULL,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

	CONSTRAINT "ResourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentConfig_code_university_key" ON "DepartmentConfig"("code", "university");

-- CreateIndex
CREATE UNIQUE INDEX "BatchConfig_code_university_departmentId_key" ON "BatchConfig"("code", "university", "departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_code_university_semester_batchId_key" ON "Subject"("code", "university", "semester", "batchId");

-- CreateIndex
CREATE INDEX "ResourceChunk_resourceId_idx" ON "ResourceChunk"("resourceId");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchConfig" ADD CONSTRAINT "BatchConfig_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "DepartmentConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceChunk" ADD CONSTRAINT "ResourceChunk_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
