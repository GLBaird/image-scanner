/*
  Warnings:

  - Added the required column `filename` to the `Image` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `Image` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Image" ADD COLUMN     "filename" TEXT NOT NULL,
ADD COLUMN     "source" TEXT NOT NULL;
