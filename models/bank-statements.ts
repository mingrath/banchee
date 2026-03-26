import { prisma } from "@/lib/db"
import type { BankStatement, BankEntry } from "@/prisma/client"
import type { ParsedBankEntry } from "@/services/bank-statement-parser"
import { cache } from "react"

// ─── Read Operations (React cache for request dedup) ──────────

export const getBankStatements = cache(
  async (userId: string): Promise<BankStatement[]> => {
    return prisma.bankStatement.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
  }
)

export const getBankStatementById = cache(
  async (userId: string, statementId: string): Promise<(BankStatement & { entries: BankEntry[] }) | null> => {
    return prisma.bankStatement.findFirst({
      where: { id: statementId, userId },
      include: { entries: { orderBy: { date: "asc" } } },
    })
  }
)

export const getEntriesForStatement = cache(
  async (statementId: string): Promise<BankEntry[]> => {
    return prisma.bankEntry.findMany({
      where: { statementId },
      orderBy: { date: "asc" },
    })
  }
)

// ─── Write Operations ─────────────────────────────────────────

export async function createBankStatement(
  userId: string,
  data: {
    bankName: string
    filename: string
    fileHash: string
    totalEntries: number
    accountNumber?: string | null
    periodStart?: Date | null
    periodEnd?: Date | null
  }
): Promise<BankStatement> {
  return prisma.bankStatement.create({
    data: {
      userId,
      bankName: data.bankName,
      filename: data.filename,
      fileHash: data.fileHash,
      totalEntries: data.totalEntries,
      accountNumber: data.accountNumber ?? null,
      periodStart: data.periodStart ?? null,
      periodEnd: data.periodEnd ?? null,
      status: "imported",
    },
  })
}

export async function createBankEntries(
  statementId: string,
  entries: ParsedBankEntry[]
): Promise<void> {
  await prisma.bankEntry.createMany({
    data: entries.map((entry) => ({
      statementId,
      date: entry.date,
      description: entry.description,
      deposit: entry.deposit || null,
      withdrawal: entry.withdrawal || null,
      balance: entry.balance,
      reference: entry.reference,
      matchStatus: "unmatched",
    })),
  })
}

export async function updateEntryMatch(
  entryId: string,
  data: {
    matchStatus: string
    transactionId?: string | null
    matchScore?: number | null
    matchReasons?: string[] | null
  }
): Promise<BankEntry> {
  return prisma.bankEntry.update({
    where: { id: entryId },
    data: {
      matchStatus: data.matchStatus,
      transactionId: data.transactionId ?? null,
      matchScore: data.matchScore ?? null,
      matchReasons: data.matchReasons ?? null,
    },
  })
}

/**
 * Recompute statement status from entry match statuses.
 * Per D-14:
 *   - All entries confirmed/created/skipped -> "reconciled"
 *   - Some entries resolved -> "in_progress"
 *   - No entries resolved -> "imported"
 */
export async function updateStatementStatus(statementId: string): Promise<void> {
  const entries = await prisma.bankEntry.findMany({
    where: { statementId },
    select: { matchStatus: true },
  })

  const total = entries.length
  if (total === 0) return

  const resolvedStatuses = new Set(["confirmed", "created", "skipped"])
  const resolvedCount = entries.filter((e) => resolvedStatuses.has(e.matchStatus)).length

  let status: string
  if (resolvedCount === total) {
    status = "reconciled"
  } else if (resolvedCount > 0) {
    status = "in_progress"
  } else {
    status = "imported"
  }

  await prisma.bankStatement.update({
    where: { id: statementId },
    data: {
      status,
      matchedEntries: resolvedCount,
    },
  })
}

export async function getResolvedEntryCount(
  statementId: string
): Promise<{ resolved: number; total: number }> {
  const resolvedStatuses = ["confirmed", "created", "skipped"]
  const [resolved, total] = await Promise.all([
    prisma.bankEntry.count({
      where: { statementId, matchStatus: { in: resolvedStatuses } },
    }),
    prisma.bankEntry.count({
      where: { statementId },
    }),
  ])
  return { resolved, total }
}

export async function deleteBankStatement(statementId: string): Promise<void> {
  // Cascade delete handles entries via onDelete: Cascade in schema
  await prisma.bankStatement.delete({
    where: { id: statementId },
  })
}

export async function findStatementByHash(
  userId: string,
  hash: string
): Promise<BankStatement | null> {
  return prisma.bankStatement.findFirst({
    where: { userId, fileHash: hash },
  })
}

export async function getBankEntryById(entryId: string): Promise<BankEntry | null> {
  return prisma.bankEntry.findUnique({
    where: { id: entryId },
  })
}
