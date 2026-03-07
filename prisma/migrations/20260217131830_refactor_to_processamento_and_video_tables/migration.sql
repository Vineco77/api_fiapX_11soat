/*
  Warnings:

  - You are about to drop the column `client_id` on the `videos` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `videos` table. All the data in the column will be lost.
  - You are about to drop the column `format` on the `videos` table. All the data in the column will be lost.
  - You are about to drop the column `frames_per_second` on the `videos` table. All the data in the column will be lost.
  - You are about to drop the column `job_id` on the `videos` table. All the data in the column will be lost.
  - Added the required column `file_format` to the `videos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_name` to the `videos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `processamento_id` to the `videos` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "videos_client_id_idx";

-- DropIndex
DROP INDEX "videos_email_idx";

-- DropIndex
DROP INDEX "videos_job_id_key";

-- AlterTable
ALTER TABLE "videos" DROP COLUMN "client_id",
DROP COLUMN "email",
DROP COLUMN "format",
DROP COLUMN "frames_per_second",
DROP COLUMN "job_id",
ADD COLUMN     "file_format" TEXT NOT NULL,
ADD COLUMN     "file_name" TEXT NOT NULL,
ADD COLUMN     "processamento_id" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "processamentos" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "frames_per_second" INTEGER NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'jpg',
    "size" BIGINT NOT NULL DEFAULT 0,
    "error" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processamentos_job_id_key" ON "processamentos"("job_id");

-- CreateIndex
CREATE INDEX "processamentos_client_id_idx" ON "processamentos"("client_id");

-- CreateIndex
CREATE INDEX "processamentos_email_idx" ON "processamentos"("email");

-- CreateIndex
CREATE INDEX "processamentos_job_id_idx" ON "processamentos"("job_id");

-- CreateIndex
CREATE INDEX "videos_processamento_id_idx" ON "videos"("processamento_id");

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_processamento_id_fkey" FOREIGN KEY ("processamento_id") REFERENCES "processamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
