-- AlterTable
ALTER TABLE "videos" 
ADD COLUMN "email" TEXT NOT NULL DEFAULT 'mock@example.com',
ADD COLUMN "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "processed_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "videos_email_idx" ON "videos"("email");
