-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "client_id" TEXT NOT NULL,
    "frames_per_second" INTEGER NOT NULL,
    "input_url_storage" TEXT NOT NULL,
    "output_url_storage" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'jpg',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "videos_job_id_key" ON "videos"("job_id");

-- CreateIndex
CREATE INDEX "videos_client_id_idx" ON "videos"("client_id");

-- CreateIndex
CREATE INDEX "videos_status_idx" ON "videos"("status");
