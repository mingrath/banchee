-- AlterTable
ALTER TABLE "contacts" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "filing_statuses" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "is_non_deductible" BOOLEAN DEFAULT false,
ADD COLUMN     "non_deductible_category" TEXT,
ADD COLUMN     "non_deductible_reason" TEXT;

-- CreateIndex
CREATE INDEX "transactions_is_non_deductible_idx" ON "transactions"("is_non_deductible");
