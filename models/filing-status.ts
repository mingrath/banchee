import { prisma } from "@/lib/db"
import type { FilingStatus } from "@/prisma/client"

export async function getFilingStatuses(userId: string, taxYear: number): Promise<FilingStatus[]> {
  return prisma.filingStatus.findMany({
    where: { userId, taxYear },
    orderBy: [{ taxMonth: "desc" }, { formType: "asc" }],
  })
}

export async function getFilingStatusesForMonth(
  userId: string,
  taxMonth: number,
  taxYear: number
): Promise<FilingStatus[]> {
  return prisma.filingStatus.findMany({
    where: { userId, taxMonth, taxYear },
  })
}

export async function upsertFilingStatus(userId: string, data: {
  formType: string; taxMonth: number; taxYear: number; status: string; filedAt?: Date | null
}): Promise<FilingStatus> {
  return prisma.filingStatus.upsert({
    where: {
      userId_formType_taxMonth_taxYear: {
        userId,
        formType: data.formType,
        taxMonth: data.taxMonth,
        taxYear: data.taxYear,
      },
    },
    update: {
      status: data.status,
      filedAt: data.filedAt ?? null,
    },
    create: {
      userId,
      formType: data.formType,
      taxMonth: data.taxMonth,
      taxYear: data.taxYear,
      status: data.status,
      filedAt: data.filedAt ?? null,
    },
  })
}
