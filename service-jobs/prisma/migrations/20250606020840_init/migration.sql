-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "images" INTEGER NOT NULL DEFAULT 0,
    "jpegs" INTEGER NOT NULL DEFAULT 0,
    "pngs" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scanned" BOOLEAN NOT NULL DEFAULT false,
    "inProgress" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "filesize" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "md5" TEXT NOT NULL,
    "sha1" TEXT NOT NULL,
    "jobIds" TEXT[],

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExifData" (
    "md5" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exif" TEXT NOT NULL,

    CONSTRAINT "ExifData_pkey" PRIMARY KEY ("md5")
);

-- CreateTable
CREATE TABLE "Face" (
    "id" TEXT NOT NULL,
    "md5" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hash" TEXT NOT NULL,
    "coordX" INTEGER NOT NULL,
    "coordY" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "Face_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classification" (
    "md5" TEXT NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("md5")
);

-- CreateIndex
CREATE UNIQUE INDEX "Image_md5_key" ON "Image"("md5");

-- CreateIndex
CREATE INDEX "Image_md5_sha1_idx" ON "Image"("md5", "sha1");

-- CreateIndex
CREATE UNIQUE INDEX "ExifData_md5_key" ON "ExifData"("md5");

-- CreateIndex
CREATE INDEX "Face_md5_idx" ON "Face"("md5");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_md5_key" ON "Classification"("md5");

-- CreateIndex
CREATE INDEX "Classification_md5_idx" ON "Classification"("md5");

-- AddForeignKey
ALTER TABLE "ExifData" ADD CONSTRAINT "ExifData_md5_fkey" FOREIGN KEY ("md5") REFERENCES "Image"("md5") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Face" ADD CONSTRAINT "Face_md5_fkey" FOREIGN KEY ("md5") REFERENCES "Image"("md5") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_md5_fkey" FOREIGN KEY ("md5") REFERENCES "Image"("md5") ON DELETE CASCADE ON UPDATE CASCADE;
