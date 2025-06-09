/*
  Warnings:

  - A unique constraint covering the columns `[sha1]` on the table `Image` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `colorspace` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `depth` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `format` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resolution` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sha1` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Image_md5_idx";

-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "colorspace" TEXT NOT NULL,
ADD COLUMN     "depth" INTEGER NOT NULL,
ADD COLUMN     "format" TEXT NOT NULL,
ADD COLUMN     "resolution" TEXT NOT NULL,
ADD COLUMN     "sha1" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Image_sha1_key" ON "Image"("sha1");

-- CreateIndex
CREATE INDEX "Image_md5_sha1_idx" ON "Image"("md5", "sha1");
