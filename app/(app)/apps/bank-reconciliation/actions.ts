"use server"

import { revalidatePath } from "next/cache"
import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { columnMappingSchema, importBankStatementSchema } from "@/forms/bank-statement"
import {
  createBankStatement,
  createBankEntries,
  updateEntryMatch,
  updateStatementStatus,
  deleteBankStatement,
  findStatementByHash,
  getBankEntryById,
} from "@/models/bank-statements"
import {
  parseCSVBuffer,
  parseExcelBuffer,
  parseBankEntries,
  generateFileHash,
  BANK_PRESETS,
} from "@/services/bank-statement-parser"
import { findMatches } from "@/services/bank-reconciliation"
import { createTransaction, getTransactions } from "@/models/transactions"

const REVALIDATE_PATH = "/apps/bank-reconciliation"
const MAX_ROWS = 10000

// ─── Import Action ────────────────────────────────────────────

export async function importBankStatementAction(
  prevState: ActionState<{ statementId: string }> | null,
  formData: FormData
): Promise<ActionState<{ statementId: string }>> {
  try {
    const user = await getCurrentUser()

    // 1. Extract and validate file
    const file = formData.get("file") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "กรุณาเลือกไฟล์" }
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // 2. Determine file type from extension
    const filename = file.name.toLowerCase()
    const isExcel = filename.endsWith(".xlsx") || filename.endsWith(".xls")
    const isCSV = filename.endsWith(".csv")
    if (!isExcel && !isCSV) {
      return { success: false, error: "รองรับเฉพาะไฟล์ .csv, .xlsx, .xls" }
    }

    // 3. Validate import params
    const bankNameRaw = formData.get("bankName") as string
    const skipLinesRaw = formData.get("skipLines") as string
    const importParsed = importBankStatementSchema.safeParse({
      bankName: bankNameRaw,
      skipLines: skipLinesRaw,
    })
    if (!importParsed.success) {
      return { success: false, error: importParsed.error.errors[0].message }
    }

    // 4. Validate column mapping
    const mappingRaw = {
      date: formData.get("mapping_date"),
      description: formData.get("mapping_description"),
      deposit: formData.get("mapping_deposit") || null,
      withdrawal: formData.get("mapping_withdrawal") || null,
      balance: formData.get("mapping_balance") || null,
      reference: formData.get("mapping_reference") || null,
    }
    const mappingParsed = columnMappingSchema.safeParse(mappingRaw)
    if (!mappingParsed.success) {
      return { success: false, error: mappingParsed.error.errors[0].message }
    }
    const mapping = mappingParsed.data

    // 5. Parse file rows
    let rows: string[][]
    if (isExcel) {
      rows = await parseExcelBuffer(buffer)
    } else {
      rows = await parseCSVBuffer(buffer, importParsed.data.skipLines)
    }

    // 6. Enforce row limit
    if (rows.length > MAX_ROWS) {
      return {
        success: false,
        error: "ไฟล์มีข้อมูลมากเกินไป (สูงสุด 10,000 รายการ)",
      }
    }

    if (rows.length === 0) {
      return { success: false, error: "ไม่พบข้อมูลในไฟล์" }
    }

    // 7. Look up bank preset for useBuddhistEra flag
    const preset = BANK_PRESETS[importParsed.data.bankName]
    const useBuddhistEra = preset?.useBuddhistEra ?? false

    // 8. Parse bank entries from rows
    const parsedEntries = parseBankEntries(rows, mapping, useBuddhistEra)

    // 9. Check for duplicate file
    const fileHash = generateFileHash(buffer)
    const existing = await findStatementByHash(user.id, fileHash)
    if (existing) {
      return {
        success: false,
        error: "ไฟล์นี้เคยนำเข้าแล้ว",
      }
    }

    // 10. Create BankStatement
    const statement = await createBankStatement(user.id, {
      bankName: importParsed.data.bankName,
      filename: file.name,
      fileHash,
      totalEntries: parsedEntries.length,
    })

    // 11. Create BankEntry rows
    await createBankEntries(statement.id, parsedEntries)

    // 12. Run auto-matching against existing transactions
    const { transactions } = await getTransactions(user.id)
    for (const entry of parsedEntries) {
      const entryAmount = entry.deposit > 0 ? entry.deposit : entry.withdrawal
      const matches = findMatches(
        {
          amount: entryAmount,
          date: entry.date,
          description: entry.description,
        },
        transactions.map((tx) => ({
          id: tx.id,
          total: tx.total ?? 0,
          issuedAt: tx.issuedAt ?? new Date(),
          name: tx.name ?? "",
        }))
      )

      if (matches.length > 0) {
        const topMatch = matches[0]
        // Find the corresponding BankEntry by matching its data
        // We need to get the entries we just created
        const entries = await getEntriesForAutoMatch(statement.id, entry)
        if (entries.length > 0) {
          await updateEntryMatch(entries[0].id, {
            matchStatus: "suggested",
            transactionId: topMatch.transactionId,
            matchScore: topMatch.score,
            matchReasons: topMatch.reasons,
          })
        }
      }
    }

    // 13. Update statement status
    await updateStatementStatus(statement.id)

    revalidatePath(REVALIDATE_PATH)
    return { success: true, data: { statementId: statement.id } }
  } catch (error) {
    console.error("Failed to import bank statement:", error)
    return { success: false, error: "นำเข้าข้อมูลไม่สำเร็จ" }
  }
}

/**
 * Helper to find the BankEntry row matching a parsed entry.
 * Uses date + description + deposit/withdrawal for matching.
 */
async function getEntriesForAutoMatch(
  statementId: string,
  entry: { date: Date; description: string; deposit: number; withdrawal: number }
) {
  const { prisma } = await import("@/lib/db")
  return prisma.bankEntry.findMany({
    where: {
      statementId,
      date: entry.date,
      description: entry.description,
      deposit: entry.deposit || null,
      withdrawal: entry.withdrawal || null,
      matchStatus: "unmatched",
    },
    take: 1,
  })
}

// ─── Match Actions ────────────────────────────────────────────

export async function confirmMatchAction(
  entryId: string,
  transactionId: string
): Promise<ActionState<null>> {
  try {
    await getCurrentUser()

    const entry = await getBankEntryById(entryId)
    if (!entry) {
      return { success: false, error: "ไม่พบรายการ" }
    }

    await updateEntryMatch(entryId, {
      matchStatus: "confirmed",
      transactionId,
    })
    await updateStatementStatus(entry.statementId)

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (error) {
    console.error("Failed to confirm match:", error)
    return { success: false, error: "ยืนยันการจับคู่ไม่สำเร็จ" }
  }
}

export async function rejectMatchAction(
  entryId: string
): Promise<ActionState<null>> {
  try {
    await getCurrentUser()

    const entry = await getBankEntryById(entryId)
    if (!entry) {
      return { success: false, error: "ไม่พบรายการ" }
    }

    await updateEntryMatch(entryId, {
      matchStatus: "unmatched",
      transactionId: null,
      matchScore: null,
      matchReasons: null,
    })
    await updateStatementStatus(entry.statementId)

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (error) {
    console.error("Failed to reject match:", error)
    return { success: false, error: "ปฏิเสธการจับคู่ไม่สำเร็จ" }
  }
}

export async function createTransactionFromEntryAction(
  entryId: string
): Promise<ActionState<{ transactionId: string }>> {
  try {
    const user = await getCurrentUser()

    const entry = await getBankEntryById(entryId)
    if (!entry) {
      return { success: false, error: "ไม่พบรายการ" }
    }

    // Determine type and amount from deposit/withdrawal
    const isDeposit = (entry.deposit ?? 0) > 0
    const type = isDeposit ? "income" : "expense"
    const amount = isDeposit ? (entry.deposit ?? 0) : (entry.withdrawal ?? 0)

    const transaction = await createTransaction(user.id, {
      name: entry.description,
      total: amount,
      type,
      issuedAt: entry.date,
    })

    await updateEntryMatch(entryId, {
      matchStatus: "created",
      transactionId: transaction.id,
    })
    await updateStatementStatus(entry.statementId)

    revalidatePath(REVALIDATE_PATH)
    return { success: true, data: { transactionId: transaction.id } }
  } catch (error) {
    console.error("Failed to create transaction from entry:", error)
    return { success: false, error: "สร้างรายการไม่สำเร็จ" }
  }
}

export async function skipEntryAction(
  entryId: string
): Promise<ActionState<null>> {
  try {
    await getCurrentUser()

    const entry = await getBankEntryById(entryId)
    if (!entry) {
      return { success: false, error: "ไม่พบรายการ" }
    }

    await updateEntryMatch(entryId, {
      matchStatus: "skipped",
    })
    await updateStatementStatus(entry.statementId)

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (error) {
    console.error("Failed to skip entry:", error)
    return { success: false, error: "ข้ามรายการไม่สำเร็จ" }
  }
}

export async function undoMatchAction(
  entryId: string
): Promise<ActionState<null>> {
  try {
    await getCurrentUser()

    const entry = await getBankEntryById(entryId)
    if (!entry) {
      return { success: false, error: "ไม่พบรายการ" }
    }

    await updateEntryMatch(entryId, {
      matchStatus: "unmatched",
      transactionId: null,
    })
    await updateStatementStatus(entry.statementId)

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (error) {
    console.error("Failed to undo match:", error)
    return { success: false, error: "ยกเลิกการจับคู่ไม่สำเร็จ" }
  }
}

export async function deleteStatementAction(
  statementId: string
): Promise<ActionState<null>> {
  try {
    await getCurrentUser()

    await deleteBankStatement(statementId)

    revalidatePath(REVALIDATE_PATH)
    return { success: true }
  } catch (error) {
    console.error("Failed to delete statement:", error)
    return { success: false, error: "ลบรายการไม่สำเร็จ" }
  }
}
