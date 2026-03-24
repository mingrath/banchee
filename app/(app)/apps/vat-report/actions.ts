"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { getBusinessProfile, type BusinessProfile } from "@/models/business-profile"
import { prisma } from "@/lib/db"
import { generatePP30Txt } from "@/services/export-rd"

export type TransactionForReport = {
  sequenceNumber: number
  issuedAt: Date | null
  documentNumber: string | null
  merchant: string | null
  merchantTaxId: string | null
  merchantBranch: string | null
  subtotal: number // satang
  vatAmount: number // satang
}

export type PP30Fields = {
  salesAmount: number // Field 1: total sales
  zeroRateSales: number // Field 2: 0% rate sales (0 for now)
  exemptSales: number // Field 3: exempt sales (0 for now)
  taxableSales: number // Field 4: (1)-(2)-(3)
  outputTax: number // Field 5: output tax this month
  purchaseAmount: number // Field 6: total purchases
  inputTax: number // Field 7: input tax this month
  taxPayable: number // Field 8: (5)-(7) if positive
  excessTax: number // Field 9: (7)-(5) if input > output
  carriedForward: number // Field 10: excess from last month (0 for Phase 1)
  netPayable: number // Field 11: (8)-(10)
  netExcess: number // Field 12: remaining carried forward
  surcharge: number // Field 13: 0
  penalty: number // Field 14: 0
  totalPayable: number // Field 15: (11)+(13)+(14)
  totalExcess: number // Field 16: total excess after surcharge
}

export type VATReportData = {
  period: { month: number; year: number }
  businessProfile: BusinessProfile
  outputVAT: number
  inputVAT: number
  netVAT: number
  outputTransactions: TransactionForReport[]
  inputTransactions: TransactionForReport[]
  pp30Fields: PP30Fields
}

// ─── Shared data helper ──────────────────────────────────────

export async function getVATReportData(
  userId: string,
  month: number,
  year: number
): Promise<VATReportData> {
  const businessProfile = await getBusinessProfile(userId)

  // Build date range for the selected month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999) // last day of month

  // Query output VAT transactions (sales)
  const outputRaw = await prisma.transaction.findMany({
    where: {
      userId,
      vatType: "output",
      issuedAt: { gte: startDate, lte: endDate },
    },
    orderBy: { issuedAt: "asc" },
    select: {
      issuedAt: true,
      documentNumber: true,
      merchant: true,
      merchantTaxId: true,
      merchantBranch: true,
      subtotal: true,
      vatAmount: true,
    },
  })

  // Query input VAT transactions (purchases)
  const inputRaw = await prisma.transaction.findMany({
    where: {
      userId,
      vatType: "input",
      issuedAt: { gte: startDate, lte: endDate },
    },
    orderBy: { issuedAt: "asc" },
    select: {
      issuedAt: true,
      documentNumber: true,
      merchant: true,
      merchantTaxId: true,
      merchantBranch: true,
      subtotal: true,
      vatAmount: true,
    },
  })

  const outputTransactions: TransactionForReport[] = outputRaw.map((t, i) => ({
    sequenceNumber: i + 1,
    issuedAt: t.issuedAt,
    documentNumber: t.documentNumber,
    merchant: t.merchant,
    merchantTaxId: t.merchantTaxId,
    merchantBranch: t.merchantBranch,
    subtotal: t.subtotal || 0,
    vatAmount: t.vatAmount || 0,
  }))

  const inputTransactions: TransactionForReport[] = inputRaw.map((t, i) => ({
    sequenceNumber: i + 1,
    issuedAt: t.issuedAt,
    documentNumber: t.documentNumber,
    merchant: t.merchant,
    merchantTaxId: t.merchantTaxId,
    merchantBranch: t.merchantBranch,
    subtotal: t.subtotal || 0,
    vatAmount: t.vatAmount || 0,
  }))

  // Compute totals
  const totalOutputSubtotal = outputTransactions.reduce((sum, t) => sum + t.subtotal, 0)
  const totalOutputVAT = outputTransactions.reduce((sum, t) => sum + t.vatAmount, 0)
  const totalInputSubtotal = inputTransactions.reduce((sum, t) => sum + t.subtotal, 0)
  const totalInputVAT = inputTransactions.reduce((sum, t) => sum + t.vatAmount, 0)

  // Compute PP30 fields per THAI_TAX_REFERENCE.md Section 5
  const salesAmount = totalOutputSubtotal // Field 1
  const zeroRateSales = 0 // Field 2 (0 for Phase 1)
  const exemptSales = 0 // Field 3 (0 for Phase 1)
  const taxableSales = salesAmount - zeroRateSales - exemptSales // Field 4
  const outputTax = totalOutputVAT // Field 5
  const purchaseAmount = totalInputSubtotal // Field 6
  const inputTax = totalInputVAT // Field 7

  const taxDifference = outputTax - inputTax
  const taxPayable = taxDifference > 0 ? taxDifference : 0 // Field 8
  const excessTax = taxDifference < 0 ? Math.abs(taxDifference) : 0 // Field 9
  const carriedForward = 0 // Field 10 (0 for Phase 1)

  const netPayable = Math.max(0, taxPayable - carriedForward) // Field 11
  const netExcess = carriedForward > taxPayable ? carriedForward - taxPayable : 0 // Field 12 (plus excess from Field 9)
  const surcharge = 0 // Field 13
  const penalty = 0 // Field 14
  const totalPayableAmount = netPayable + surcharge + penalty // Field 15
  const totalExcess = excessTax + netExcess // Field 16

  const pp30Fields: PP30Fields = {
    salesAmount,
    zeroRateSales,
    exemptSales,
    taxableSales,
    outputTax,
    purchaseAmount,
    inputTax,
    taxPayable,
    excessTax,
    carriedForward,
    netPayable,
    netExcess,
    surcharge,
    penalty,
    totalPayable: totalPayableAmount,
    totalExcess,
  }

  return {
    period: { month, year },
    businessProfile,
    outputVAT: totalOutputVAT,
    inputVAT: totalInputVAT,
    netVAT: totalOutputVAT - totalInputVAT,
    outputTransactions,
    inputTransactions,
    pp30Fields,
  }
}

// ─── Generate VAT Report ────────────────────────────────────

export async function generateVATReportAction(
  prevState: ActionState<VATReportData> | null,
  formData: FormData
): Promise<ActionState<VATReportData>> {
  try {
    const user = await getCurrentUser()
    const month = parseInt(formData.get("month") as string, 10)
    const year = parseInt(formData.get("year") as string, 10)

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return { success: false, error: "กรุณาเลือกเดือนและปีที่ถูกต้อง" }
    }

    const reportData = await getVATReportData(user.id, month, year)
    return { success: true, data: reportData }
  } catch (error) {
    console.error("Failed to generate VAT report:", error)
    return { success: false, error: "สร้างรายงานไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}

// ─── Export PP30 TXT for e-Filing ───────────────────────────

export async function exportPP30TxtAction(
  prevState: ActionState<string> | null,
  formData: FormData
): Promise<ActionState<string>> {
  try {
    const user = await getCurrentUser()
    const month = parseInt(formData.get("month") as string, 10)
    const year = parseInt(formData.get("year") as string, 10)

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return { success: false, error: "กรุณาเลือกเดือนและปีที่ถูกต้อง" }
    }

    const reportData = await getVATReportData(user.id, month, year)
    const txtContent = generatePP30Txt(reportData)
    return { success: true, data: txtContent }
  } catch (error) {
    console.error("Failed to export PP30 TXT:", error)
    return { success: false, error: "ส่งออกไฟล์ไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}
