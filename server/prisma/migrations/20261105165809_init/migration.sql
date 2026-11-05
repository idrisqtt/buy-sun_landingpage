-- CreateEnum
CREATE TYPE "LeadType" AS ENUM ('quick', 'callback', 'anketa');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'sent', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('pdf', 'selfie', 'full_body', 'additional');

-- CreateTable
CREATE TABLE "leads" (
    "id" SERIAL NOT NULL,
    "type" "LeadType" NOT NULL,
    "name" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "answers" JSONB,
    "utm" JSONB,
    "consent_at" TIMESTAMP(3),
    "bitrix_status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "bitrix_lead_id" INTEGER,
    "bitrix_error" TEXT,
    "email_status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "email_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_files" (
    "id" SERIAL NOT NULL,
    "lead_id" INTEGER NOT NULL,
    "kind" "FileKind" NOT NULL,
    "path" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_created_at_idx" ON "leads"("created_at");

-- CreateIndex
CREATE INDEX "leads_phone_idx" ON "leads"("phone");

-- CreateIndex
CREATE INDEX "lead_files_lead_id_idx" ON "lead_files"("lead_id");

-- AddForeignKey
ALTER TABLE "lead_files" ADD CONSTRAINT "lead_files_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
