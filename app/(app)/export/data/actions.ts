"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getBusinessProfile } from "@/models/business-profile"
import { generateFlowAccountCSV, type FlowAccountTransaction } from "@/services/export-flowaccount"
import { generateAccountantExcel, type IncomeExpenseRow, type ExportDataForExcel } from "@/services/export-excel"
import { getVATReportData } from "@/app/(app)/apps/vat-report/actions"
import { getWHTReportData } from "@/app/(app)/apps/wht-report/actions"

// ─── FlowAccount CSV Export ─────────────────────────────────

export async function exportFlowAccountCSVAction(
  prevState: ActionState<string> | null,
  formData: FormData
): Promise<ActionState<string>> {
  try {
    const user = await getCurrentUser()
    const dateFrom = formData.get("dateFrom") as string
    const dateTo = formData.get("dateTo") as string

    if (!dateFrom || !dateTo) {
      return { success: false, error: "กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด" }
    }

    const startDate = new Date(dateFrom)
    const endDate = new Date(dateTo)
    endDate.setHours(23, 59, 59, 999)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: "รูปแบบวันที่ไม่ถูกต้อง" }
    }

    if (startDate > endDate) {
      return { success: false, error: "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด" }
    }

    // Query transactions with category relation
    const transactionsRaw = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        issuedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { issuedAt: "asc" },
      select: {
        issuedAt: true,
        documentNumber: true,
        description: true,
        type: true,
        total: true,
        vatAmount: true,
        category: { select: { name: true } },
      },
    })

    const mapped: FlowAccountTransaction[] = transactionsRaw.map((t) => ({
      date: t.issuedAt,
      documentNumber: t.documentNumber,
      description: t.description,
      type: t.type === "income" ? "income" as const : "expense" as const,
      amount: t.total || 0,
      vatAmount: t.vatAmount || 0,
      category: t.category?.name ?? null,
    }))

    const csvContent = await generateFlowAccountCSV(mapped)
    return { success: true, data: csvContent }
  } catch (error) {
    console.error("Failed to export FlowAccount CSV:", error)
    return { success: false, error: "ส่งออกไฟล์ไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}

// ─── Accountant Excel Export ────────────────────────────────

export async function exportAccountantExcelAction(
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

    // Get VAT and WHT report data
    const vatData = await getVATReportData(user.id, month, year)
    const whtData = await getWHTReportData(user.id, month, year)

    // Query income/expense transactions for the month
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0, 23, 59, 59, 999)

    const transactionsRaw = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        issuedAt: { gte: startDate, lte: endDate },
      },
      orderBy: { issuedAt: "asc" },
      select: {
        issuedAt: true,
        description: true,
        type: true,
        total: true,
        vatAmount: true,
        category: { select: { name: true } },
      },
    })

    const incomeExpenseTransactions: IncomeExpenseRow[] = transactionsRaw.map((t) => ({
      date: t.issuedAt,
      description: t.description,
      type: t.type === "income" ? "income" as const : "expense" as const,
      amount: t.total || 0,
      vatAmount: t.vatAmount || 0,
      category: t.category?.name ?? null,
    }))

    const businessProfile = await getBusinessProfile(user.id)

    const exportData: ExportDataForExcel = {
      vatData,
      whtData,
      incomeExpenseTransactions,
      businessProfile,
      period: { month, year },
    }

    const buffer = await generateAccountantExcel(exportData)
    const base64String = buffer.toString("base64")
    return { success: true, data: base64String }
  } catch (error) {
    console.error("Failed to export accountant Excel:", error)
    return { success: false, error: "ส่งออกไฟล์ไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}
