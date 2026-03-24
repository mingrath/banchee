"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { getBusinessProfile, type BusinessProfile } from "@/models/business-profile"
import { prisma } from "@/lib/db"
import { generatePND3Txt, generatePND53Txt } from "@/services/export-rd"

// ─── Types ────────────────────────────────────────────────────

export type WHTTransactionForReport = {
  id: string
  sequenceNumber: number
  merchant: string | null
  description: string | null
  issuedAt: Date | null
  subtotal: number // pre-VAT base (satang)
  total: number // VAT-inclusive total (satang)
  whtRate: number // basis points
  whtAmount: number // satang
  whtType: string // "pnd3" | "pnd53"
  contactId: string | null
  contactName: string | null
  contactTaxId: string | null
  contactBranch: string | null
  contactAddress: string | null
}

export type WHTReportSummary = {
  totalIncomePaid: number // satang -- sum of subtotals
  totalTaxWithheld: number // satang -- sum of whtAmounts
  transactionCount: number
}

export type WHTReportData = {
  transactions: WHTTransactionForReport[]
  pnd3Summary: WHTReportSummary
  pnd53Summary: WHTReportSummary
  pnd3Transactions: WHTTransactionForReport[]
  pnd53Transactions: WHTTransactionForReport[]
  month: number
  year: number
  businessProfile: BusinessProfile
}

export type FiftyTawiData = {
  transaction: WHTTransactionForReport
  businessProfile: BusinessProfile
  certificateNumber: string
  issuedDate: Date
}

// ─── Shared data helper ──────────────────────────────────────

export async function getWHTReportData(
  userId: string,
  month: number,
  year: number
): Promise<WHTReportData> {
  const businessProfile = await getBusinessProfile(userId)

  // Build date range for the selected month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59, 999)

  // Query all WHT transactions for the month
  const transactionsRaw = await prisma.transaction.findMany({
    where: {
      userId,
      whtType: { not: null },
      whtAmount: { gt: 0 },
      issuedAt: { gte: startDate, lte: endDate },
    },
    orderBy: { issuedAt: "asc" },
    select: {
      id: true,
      merchant: true,
      description: true,
      issuedAt: true,
      subtotal: true,
      total: true,
      whtRate: true,
      whtAmount: true,
      whtType: true,
      contactId: true,
    },
  })

  // Batch-fetch all contacts for these transactions
  const contactIds = transactionsRaw
    .map((t) => t.contactId)
    .filter((id): id is string => id !== null)
  const uniqueContactIds = [...new Set(contactIds)]

  const contacts = uniqueContactIds.length > 0
    ? await prisma.contact.findMany({
        where: { id: { in: uniqueContactIds }, userId },
      })
    : []

  const contactMap = new Map(contacts.map((c) => [c.id, c]))

  // Map to report format with sequence numbers
  const transactions: WHTTransactionForReport[] = transactionsRaw.map((t, i) => {
    const contact = t.contactId ? contactMap.get(t.contactId) ?? null : null
    return {
      id: t.id,
      sequenceNumber: i + 1,
      merchant: t.merchant,
      description: t.description,
      issuedAt: t.issuedAt,
      subtotal: t.subtotal || 0,
      total: t.total || 0,
      whtRate: t.whtRate || 0,
      whtAmount: t.whtAmount || 0,
      whtType: t.whtType || "pnd3",
      contactId: t.contactId,
      contactName: contact?.name ?? t.merchant ?? null,
      contactTaxId: contact?.taxId ?? null,
      contactBranch: contact?.branch ?? null,
      contactAddress: contact?.address ?? null,
    }
  })

  // Split into PND3 and PND53 groups
  const pnd3Transactions = transactions.filter((t) => t.whtType === "pnd3")
  const pnd53Transactions = transactions.filter((t) => t.whtType === "pnd53")

  // Re-sequence within each group
  const pnd3Sequenced = pnd3Transactions.map((t, i) => ({ ...t, sequenceNumber: i + 1 }))
  const pnd53Sequenced = pnd53Transactions.map((t, i) => ({ ...t, sequenceNumber: i + 1 }))

  const computeSummary = (txns: WHTTransactionForReport[]): WHTReportSummary => ({
    totalIncomePaid: txns.reduce((sum, t) => sum + t.subtotal, 0),
    totalTaxWithheld: txns.reduce((sum, t) => sum + t.whtAmount, 0),
    transactionCount: txns.length,
  })

  return {
    transactions,
    pnd3Summary: computeSummary(pnd3Sequenced),
    pnd53Summary: computeSummary(pnd53Sequenced),
    pnd3Transactions: pnd3Sequenced,
    pnd53Transactions: pnd53Sequenced,
    month,
    year,
    businessProfile,
  }
}

// ─── Generate WHT Report ──────────────────────────────────────

export async function generateWHTReportAction(
  prevState: ActionState<WHTReportData> | null,
  formData: FormData
): Promise<ActionState<WHTReportData>> {
  try {
    const user = await getCurrentUser()
    const month = parseInt(formData.get("month") as string, 10)
    const year = parseInt(formData.get("year") as string, 10)

    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
      return { success: false, error: "กรุณาเลือกเดือนและปีที่ถูกต้อง" }
    }

    const reportData = await getWHTReportData(user.id, month, year)
    return { success: true, data: reportData }
  } catch (error) {
    console.error("Failed to generate WHT report:", error)
    return { success: false, error: "สร้างรายงานไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}

// ─── Export PND3 TXT for e-Filing ───────────────────────────

export async function exportPND3TxtAction(
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

    const reportData = await getWHTReportData(user.id, month, year)
    const txtContent = generatePND3Txt(reportData)
    return { success: true, data: txtContent }
  } catch (error) {
    console.error("Failed to export PND3 TXT:", error)
    return { success: false, error: "ส่งออกไฟล์ไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}

// ─── Export PND53 TXT for e-Filing ──────────────────────────

export async function exportPND53TxtAction(
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

    const reportData = await getWHTReportData(user.id, month, year)
    const txtContent = generatePND53Txt(reportData)
    return { success: true, data: txtContent }
  } catch (error) {
    console.error("Failed to export PND53 TXT:", error)
    return { success: false, error: "ส่งออกไฟล์ไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}

// ─── Generate 50 Tawi Certificate ─────────────────────────────

/**
 * Generate a 50 Tawi certificate for a single transaction.
 * Uses atomic sequential numbering via Setting model with code "seq_50_tawi".
 */
export async function generate50TawiAction(
  prevState: ActionState<FiftyTawiData> | null,
  formData: FormData
): Promise<ActionState<FiftyTawiData>> {
  try {
    const user = await getCurrentUser()
    const transactionId = formData.get("transactionId") as string

    if (!transactionId) {
      return { success: false, error: "ไม่พบรายการ" }
    }

    const businessProfile = await getBusinessProfile(user.id)

    // Load the transaction
    const txn = await prisma.transaction.findFirst({
      where: { id: transactionId, userId: user.id },
      select: {
        id: true,
        merchant: true,
        description: true,
        issuedAt: true,
        subtotal: true,
        total: true,
        whtRate: true,
        whtAmount: true,
        whtType: true,
        contactId: true,
      },
    })

    if (!txn) {
      return { success: false, error: "ไม่พบรายการที่ต้องการ" }
    }

    // Load contact if present
    let contact = null
    if (txn.contactId) {
      contact = await prisma.contact.findFirst({
        where: { id: txn.contactId, userId: user.id },
      })
    }

    // Atomic sequential numbering for 50 Tawi certificates
    const nextNumber = await prisma.$transaction(async (tx) => {
      const current = await tx.setting.findFirst({
        where: { userId: user.id, code: "seq_50_tawi" },
      })
      const next = (parseInt(current?.value ?? "0", 10) + 1).toString()
      await tx.setting.upsert({
        where: { userId_code: { userId: user.id, code: "seq_50_tawi" } },
        update: { value: next },
        create: { userId: user.id, code: "seq_50_tawi", name: "seq_50_tawi", value: next },
      })
      return next
    })

    // Buddhist Era year for certificate number
    const now = new Date()
    const buddhistYear = now.getFullYear() + 543
    const certificateNumber = `${nextNumber}/${buddhistYear}`

    const transaction: WHTTransactionForReport = {
      id: txn.id,
      sequenceNumber: 1,
      merchant: txn.merchant,
      description: txn.description,
      issuedAt: txn.issuedAt,
      subtotal: txn.subtotal || 0,
      total: txn.total || 0,
      whtRate: txn.whtRate || 0,
      whtAmount: txn.whtAmount || 0,
      whtType: txn.whtType || "pnd3",
      contactId: txn.contactId,
      contactName: contact?.name ?? txn.merchant ?? null,
      contactTaxId: contact?.taxId ?? null,
      contactBranch: contact?.branch ?? null,
      contactAddress: contact?.address ?? null,
    }

    return {
      success: true,
      data: {
        transaction,
        businessProfile,
        certificateNumber,
        issuedDate: now,
      },
    }
  } catch (error) {
    console.error("Failed to generate 50 Tawi:", error)
    return { success: false, error: "สร้างหนังสือรับรองไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}

/**
 * Get the next 50 Tawi certificate number without incrementing.
 * Used for batch generation to pre-allocate numbers.
 */
export async function getNextCertificateNumber(userId: string, count: number): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.setting.findFirst({
      where: { userId, code: "seq_50_tawi" },
    })
    const startNum = parseInt(current?.value ?? "0", 10) + 1
    const endNum = startNum + count - 1
    const buddhistYear = new Date().getFullYear() + 543

    await tx.setting.upsert({
      where: { userId_code: { userId, code: "seq_50_tawi" } },
      update: { value: endNum.toString() },
      create: { userId, code: "seq_50_tawi", name: "seq_50_tawi", value: endNum.toString() },
    })

    return Array.from({ length: count }, (_, i) => `${startNum + i}/${buddhistYear}`)
  })
}
