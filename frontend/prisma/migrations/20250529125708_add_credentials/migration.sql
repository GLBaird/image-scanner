-- CreateTable
CREATE TABLE "credentials" (
    "id" SERIAL NOT NULL,
    "ref" BYTEA NOT NULL,
    "salt" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credentials_ref_key" ON "credentials"("ref");
