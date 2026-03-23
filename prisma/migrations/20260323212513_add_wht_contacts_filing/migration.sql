-- Create contacts table
CREATE TABLE "contacts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "tax_id" TEXT NOT NULL,
  "branch" TEXT NOT NULL DEFAULT '00000',
  "address" TEXT NOT NULL DEFAULT '',
  "type" TEXT NOT NULL DEFAULT 'vendor',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- Create filing_statuses table
CREATE TABLE "filing_statuses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "form_type" TEXT NOT NULL,
  "tax_month" INTEGER NOT NULL,
  "tax_year" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "filed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "filing_statuses_pkey" PRIMARY KEY ("id")
);

-- Add WHT columns to transactions
ALTER TABLE "transactions" ADD COLUMN "wht_rate" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "wht_amount" INTEGER;
ALTER TABLE "transactions" ADD COLUMN "wht_type" TEXT;
ALTER TABLE "transactions" ADD COLUMN "contact_id" UUID;

-- Indexes
CREATE INDEX "contacts_user_id_idx" ON "contacts"("user_id");
CREATE INDEX "contacts_name_idx" ON "contacts"("name");
CREATE UNIQUE INDEX "contacts_user_id_tax_id_branch_key" ON "contacts"("user_id", "tax_id", "branch");
CREATE INDEX "filing_statuses_user_id_idx" ON "filing_statuses"("user_id");
CREATE UNIQUE INDEX "filing_statuses_user_id_form_type_tax_month_tax_year_key" ON "filing_statuses"("user_id", "form_type", "tax_month", "tax_year");
CREATE INDEX "transactions_wht_type_idx" ON "transactions"("wht_type");

-- Foreign keys
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "filing_statuses" ADD CONSTRAINT "filing_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
