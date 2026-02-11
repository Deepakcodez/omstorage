-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "project" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "mimeType" TEXT,
    "thumbhash" TEXT,
    "blurDataUrl" TEXT,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Media_checksum_key" ON "Media"("checksum");

-- CreateIndex
CREATE INDEX "Media_type_idx" ON "Media"("type");

-- CreateIndex
CREATE INDEX "Media_project_idx" ON "Media"("project");

-- CreateIndex
CREATE INDEX "Media_name_idx" ON "Media"("name");

-- CreateIndex
CREATE INDEX "Media_checksum_idx" ON "Media"("checksum");

-- CreateIndex
CREATE INDEX "Media_createdAt_idx" ON "Media"("createdAt");
