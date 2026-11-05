-- CreateTable
CREATE TABLE "partner_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "header" TEXT NOT NULL DEFAULT '',
    "contacts" TEXT NOT NULL DEFAULT '',
    "logo" BYTEA,
    "updated_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "partner_templates" ADD CONSTRAINT "partner_templates_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
