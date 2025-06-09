/*
  Warnings:

  - You are about to drop the column `sha1` on the `Image` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Image_md5_sha1_idx";

-- AlterTable
ALTER TABLE "Image" DROP COLUMN "sha1";

-- CreateIndex
CREATE INDEX "Image_md5_idx" ON "Image"("md5");
