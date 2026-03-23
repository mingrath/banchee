import { prisma } from "@/lib/db"
import { calcTotalPerCurrency } from "@/lib/stats"
import { Prisma } from "@/prisma/client"
import { differenceInDays, subMonths } from "date-fns"
import { cache } from "react"
import { TransactionFilters } from "./transactions"
import { getDeadlinesForMonth, type FilingDeadline } from "@/services/filing-deadlines"
import { getFilingStatusesForMonth } from "@/models/filing-status"

export type DashboardStats = {
  totalIncomePerCurrency: Record<string, number>
  totalExpensesPerCurrency: Record<string, number>
  profitPerCurrency: Record<string, number>
  invoicesProcessed: number
}

export const getDashboardStats = cache(
  async (userId: string, filters: TransactionFilters = {}): Promise<DashboardStats> => {
    const where: Prisma.TransactionWhereInput = {}

    if (filters.dateFrom || filters.dateTo) {
      where.issuedAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      }
    }

    const transactions = await prisma.transaction.findMany({ where: { ...where, userId } })
    const totalIncomePerCurrency = calcTotalPerCurrency(transactions.filter((t) => t.type === "income"))
    const totalExpensesPerCurrency = calcTotalPerCurrency(transactions.filter((t) => t.type === "expense"))
    const profitPerCurrency = Object.fromEntries(
      Object.keys(totalIncomePerCurrency).map((currency) => [
        currency,
        totalIncomePerCurrency[currency] - totalExpensesPerCurrency[currency],
      ])
    )
    const invoicesProcessed = transactions.length

    return {
      totalIncomePerCurrency,
      totalExpensesPerCurrency,
      profitPerCurrency,
      invoicesProcessed,
    }
  }
)

export type ProjectStats = {
  totalIncomePerCurrency: Record<string, number>
  totalExpensesPerCurrency: Record<string, number>
  profitPerCurrency: Record<string, number>
  invoicesProcessed: number
}

export const getProjectStats = cache(async (userId: string, projectId: string, filters: TransactionFilters = {}) => {
  const where: Prisma.TransactionWhereInput = {
    projectCode: projectId,
  }

  if (filters.dateFrom || filters.dateTo) {
    where.issuedAt = {
      gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
    }
  }

  const transactions = await prisma.transaction.findMany({ where: { ...where, userId } })
  const totalIncomePerCurrency = calcTotalPerCurrency(transactions.filter((t) => t.type === "income"))
  const totalExpensesPerCurrency = calcTotalPerCurrency(transactions.filter((t) => t.type === "expense"))
  const profitPerCurrency = Object.fromEntries(
    Object.keys(totalIncomePerCurrency).map((currency) => [
      currency,
      totalIncomePerCurrency[currency] - totalExpensesPerCurrency[currency],
    ])
  )

  const invoicesProcessed = transactions.length
  return {
    totalIncomePerCurrency,
    totalExpensesPerCurrency,
    profitPerCurrency,
    invoicesProcessed,
  }
})

export type TimeSeriesData = {
  period: string
  income: number
  expenses: number
  date: Date
}

export type CategoryBreakdown = {
  code: string
  name: string
  color: string
  income: number
  expenses: number
  transactionCount: number
}

export type DetailedTimeSeriesData = {
  period: string
  income: number
  expenses: number
  date: Date
  categories: CategoryBreakdown[]
  totalTransactions: number
}

export const getTimeSeriesStats = cache(
  async (
    userId: string,
    filters: TransactionFilters = {},
    defaultCurrency: string = "EUR"
  ): Promise<TimeSeriesData[]> => {
    const where: Prisma.TransactionWhereInput = { userId }

    if (filters.dateFrom || filters.dateTo) {
      where.issuedAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      }
    }

    if (filters.categoryCode) {
      where.categoryCode = filters.categoryCode
    }

    if (filters.projectCode) {
      where.projectCode = filters.projectCode
    }

    if (filters.type) {
      where.type = filters.type
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { issuedAt: "asc" },
    })

    if (transactions.length === 0) {
      return []
    }

    // Determine if we should group by day or month
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(transactions[0].issuedAt!)
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date(transactions[transactions.length - 1].issuedAt!)
    const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
    const groupByDay = daysDiff <= 50

    // Group transactions by time period
    const grouped = transactions.reduce(
      (acc, transaction) => {
        if (!transaction.issuedAt) return acc

        const date = new Date(transaction.issuedAt)
        const period = groupByDay
          ? date.toISOString().split("T")[0] // YYYY-MM-DD
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` // YYYY-MM

        if (!acc[period]) {
          acc[period] = { period, income: 0, expenses: 0, date }
        }

        // Get amount in default currency
        const amount =
          transaction.convertedCurrencyCode?.toUpperCase() === defaultCurrency.toUpperCase()
            ? transaction.convertedTotal || 0
            : transaction.currencyCode?.toUpperCase() === defaultCurrency.toUpperCase()
              ? transaction.total || 0
              : 0 // Skip transactions not in default currency for simplicity

        if (transaction.type === "income") {
          acc[period].income += amount
        } else if (transaction.type === "expense") {
          acc[period].expenses += amount
        }

        return acc
      },
      {} as Record<string, TimeSeriesData>
    )

    return Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime())
  }
)

export const getDetailedTimeSeriesStats = cache(
  async (
    userId: string,
    filters: TransactionFilters = {},
    defaultCurrency: string = "EUR"
  ): Promise<DetailedTimeSeriesData[]> => {
    const where: Prisma.TransactionWhereInput = { userId }

    if (filters.dateFrom || filters.dateTo) {
      where.issuedAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      }
    }

    if (filters.categoryCode) {
      where.categoryCode = filters.categoryCode
    }

    if (filters.projectCode) {
      where.projectCode = filters.projectCode
    }

    if (filters.type) {
      where.type = filters.type
    }

    const [transactions, categories] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: { issuedAt: "asc" },
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
      }),
    ])

    if (transactions.length === 0) {
      return []
    }

    // Determine if we should group by day or month
    const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : new Date(transactions[0].issuedAt!)
    const dateTo = filters.dateTo ? new Date(filters.dateTo) : new Date(transactions[transactions.length - 1].issuedAt!)
    const daysDiff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24))
    const groupByDay = daysDiff <= 50

    // Create category lookup
    const categoryLookup = new Map(categories.map((cat) => [cat.code, cat]))

    // Group transactions by time period
    const grouped = transactions.reduce(
      (acc, transaction) => {
        if (!transaction.issuedAt) return acc

        const date = new Date(transaction.issuedAt)
        const period = groupByDay
          ? date.toISOString().split("T")[0] // YYYY-MM-DD
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` // YYYY-MM

        if (!acc[period]) {
          acc[period] = {
            period,
            income: 0,
            expenses: 0,
            date,
            categories: new Map<string, CategoryBreakdown>(),
            totalTransactions: 0,
          }
        }

        // Get amount in default currency
        const amount =
          transaction.convertedCurrencyCode?.toUpperCase() === defaultCurrency.toUpperCase()
            ? transaction.convertedTotal || 0
            : transaction.currencyCode?.toUpperCase() === defaultCurrency.toUpperCase()
              ? transaction.total || 0
              : 0 // Skip transactions not in default currency for simplicity

        const categoryCode = transaction.categoryCode || "other"
        const category = categoryLookup.get(categoryCode) || {
          code: "other",
          name: "Other",
          color: "#6b7280",
        }

        // Initialize category if not exists
        if (!acc[period].categories.has(categoryCode)) {
          acc[period].categories.set(categoryCode, {
            code: category.code,
            name: category.name,
            color: category.color || "#6b7280",
            income: 0,
            expenses: 0,
            transactionCount: 0,
          })
        }

        const categoryData = acc[period].categories.get(categoryCode)!
        categoryData.transactionCount++
        acc[period].totalTransactions++

        if (transaction.type === "income") {
          acc[period].income += amount
          categoryData.income += amount
        } else if (transaction.type === "expense") {
          acc[period].expenses += amount
          categoryData.expenses += amount
        }

        return acc
      },
      {} as Record<
        string,
        {
          period: string
          income: number
          expenses: number
          date: Date
          categories: Map<string, CategoryBreakdown>
          totalTransactions: number
        }
      >
    )

    return Object.values(grouped)
      .map((item) => ({
        ...item,
        categories: Array.from(item.categories.values()).filter((cat) => cat.income > 0 || cat.expenses > 0),
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }
)

// --- VAT Stats ---

export type VATSummary = {
  outputVAT: number // total output VAT in satang for period
  inputVAT: number // total input VAT in satang for period
  netVAT: number // outputVAT - inputVAT (positive = payable, negative = credit)
  outputCount: number // number of output VAT transactions
  inputCount: number // number of input VAT transactions
}

export const getVATSummary = cache(
  async (userId: string, filters: TransactionFilters = {}): Promise<VATSummary> => {
    const dateFilter: Prisma.TransactionWhereInput = {}
    if (filters.dateFrom || filters.dateTo) {
      dateFilter.issuedAt = {
        gte: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        lte: filters.dateTo ? new Date(filters.dateTo) : undefined,
      }
    }

    const [outputResult, inputResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, vatType: "output", ...dateFilter },
        _sum: { vatAmount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { userId, vatType: "input", ...dateFilter },
        _sum: { vatAmount: true },
        _count: true,
      }),
    ])

    const outputVAT = outputResult._sum.vatAmount || 0
    const inputVAT = inputResult._sum.vatAmount || 0

    return {
      outputVAT,
      inputVAT,
      netVAT: outputVAT - inputVAT,
      outputCount: outputResult._count,
      inputCount: inputResult._count,
    }
  }
)

export type ExpiringInvoice = {
  id: string
  merchant: string | null
  issuedAt: Date
  vatAmount: number
  daysRemaining: number
}

export const getExpiringInvoices = cache(
  async (userId: string): Promise<ExpiringInvoice[]> => {
    const now = new Date()
    const sixMonthsAgo = subMonths(now, 6)
    const fiveMonthsAgo = subMonths(now, 5)

    const expiring = await prisma.transaction.findMany({
      where: {
        userId,
        vatType: "input",
        issuedAt: {
          gte: sixMonthsAgo,
          lte: fiveMonthsAgo,
        },
      },
      select: { id: true, merchant: true, issuedAt: true, vatAmount: true },
      orderBy: { issuedAt: "asc" },
    })

    return expiring
      .filter((t): t is typeof t & { issuedAt: Date } => t.issuedAt !== null)
      .map((t) => {
        const expiryDate = subMonths(t.issuedAt, -6) // 6 months after issued
        const daysRemaining = differenceInDays(expiryDate, now)
        return {
          id: t.id,
          merchant: t.merchant,
          issuedAt: t.issuedAt,
          vatAmount: t.vatAmount || 0,
          daysRemaining: Math.max(0, daysRemaining),
        }
      })
  }
)

export const getRevenueYTD = cache(
  async (userId: string): Promise<number> => {
    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1) // January 1 of current year

    const result = await prisma.transaction.aggregate({
      where: {
        userId,
        type: "income",
        issuedAt: { gte: yearStart },
      },
      _sum: { total: true },
    })

    return result._sum.total || 0
  }
)

// --- WHT Stats ---

export type WHTSummary = {
  totalWithheld: number // satang -- sum of whtAmount for the month
  pnd3Withheld: number // satang -- sum for pnd3 type
  pnd53Withheld: number // satang -- sum for pnd53 type
  pnd3Count: number
  pnd53Count: number
}

export const getWHTSummary = cache(
  async (userId: string, month: number, year: number): Promise<WHTSummary> => {
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 1) // first day of next month

    const [pnd3Result, pnd53Result] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          whtType: "pnd3",
          whtAmount: { gt: 0 },
          issuedAt: { gte: startDate, lt: endDate },
        },
        _sum: { whtAmount: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          whtType: "pnd53",
          whtAmount: { gt: 0 },
          issuedAt: { gte: startDate, lt: endDate },
        },
        _sum: { whtAmount: true },
        _count: true,
      }),
    ])

    const pnd3Withheld = pnd3Result._sum.whtAmount || 0
    const pnd53Withheld = pnd53Result._sum.whtAmount || 0

    return {
      totalWithheld: pnd3Withheld + pnd53Withheld,
      pnd3Withheld,
      pnd53Withheld,
      pnd3Count: pnd3Result._count,
      pnd53Count: pnd53Result._count,
    }
  }
)

// --- Filing Deadline with Status ---

export type DeadlineWithStatus = {
  deadline: FilingDeadline
  status: "pending" | "filed" | "overdue"
  filedAt: Date | null
}

// --- CIT Stats ---

import { getBusinessProfile } from "@/models/business-profile"
import {
  calculateSMECIT,
  calculateFlatCIT,
  isSMEEligible,
  calculateEntertainmentCap,
  calculateCharitableCap,
  type CITResult,
  type EntertainmentCapResult,
  type CharitableCapResult,
} from "@/services/tax-calculator"

export type CITEstimate = {
  totalIncome: number       // satang
  totalExpenses: number     // satang
  nonDeductibleTotal: number // satang
  netProfit: number         // satang (income - expenses + nonDeductible)
  isEligible: boolean
  citResult: CITResult
  entertainmentCap: EntertainmentCapResult
  charitableCap: CharitableCapResult
}

export const getCITEstimate = cache(
  async (userId: string, year: number, periodType: "annual" | "half-year"): Promise<CITEstimate> => {
    const profile = await getBusinessProfile(userId)

    // Compute date range based on fiscal year
    const fyStart = profile.fiscalYearStart // 1-12
    const startDate = new Date(year, fyStart - 1, 1)
    let endDate: Date
    if (periodType === "annual") {
      endDate = new Date(year + 1, fyStart - 1, 1)
    } else {
      // half-year: first 6 months of fiscal year, handle wrap-around
      const endMonth = fyStart - 1 + 6
      if (endMonth > 11) {
        endDate = new Date(year + 1, endMonth - 12, 1)
      } else {
        endDate = new Date(year, endMonth, 1)
      }
    }

    const dateFilter = { gte: startDate, lt: endDate }

    const [
      incomeResult,
      expenseResult,
      nonDeductibleResult,
      entertainmentResult,
      charitableResult,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "income", issuedAt: dateFilter },
        _sum: { total: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "expense", issuedAt: dateFilter },
        _sum: { total: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "expense", isNonDeductible: true, issuedAt: dateFilter },
        _sum: { total: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "expense", nonDeductibleCategory: "entertainment", issuedAt: dateFilter },
        _sum: { total: true },
      }),
      prisma.transaction.aggregate({
        where: { userId, type: "expense", nonDeductibleCategory: "charitable", issuedAt: dateFilter },
        _sum: { total: true },
      }),
    ])

    const totalIncome = incomeResult._sum.total || 0
    const totalExpenses = expenseResult._sum.total || 0
    const nonDeductibleTotal = nonDeductibleResult._sum.total || 0
    const entertainmentTotal = entertainmentResult._sum.total || 0
    const charitableTotal = charitableResult._sum.total || 0

    // Net profit: income - expenses + non-deductible (add back non-deductible)
    const netProfit = totalIncome - totalExpenses + nonDeductibleTotal

    // SME eligibility check
    const isEligible = isSMEEligible(profile.paidUpCapital, totalIncome)

    // CIT calculation
    const citResult = isEligible
      ? calculateSMECIT(Math.max(0, netProfit))
      : calculateFlatCIT(Math.max(0, netProfit))

    // Cap calculations
    const entertainmentCap = calculateEntertainmentCap(entertainmentTotal, totalIncome, profile.paidUpCapital)
    const charitableCap = calculateCharitableCap(charitableTotal, netProfit)

    return {
      totalIncome,
      totalExpenses,
      nonDeductibleTotal,
      netProfit,
      isEligible,
      citResult,
      entertainmentCap,
      charitableCap,
    }
  }
)

// --- Non-Deductible Summary ---

export type NonDeductibleSummary = {
  totalFlagged: number        // count
  totalAmount: number         // satang
  entertainmentAmount: number // satang
  entertainmentCap: EntertainmentCapResult
  charitableAmount: number    // satang
  charitableCap: CharitableCapResult
  byCategory: { category: string; count: number; amount: number }[]
}

export const getNonDeductibleSummary = cache(
  async (userId: string, year: number): Promise<NonDeductibleSummary> => {
    const profile = await getBusinessProfile(userId)

    // Compute YTD date range from fiscal year start
    const fyStart = profile.fiscalYearStart
    const startDate = new Date(year, fyStart - 1, 1)
    const endDate = new Date(year + 1, fyStart - 1, 1)
    const dateFilter = { gte: startDate, lt: endDate }

    const [incomeResult, groupedResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, type: "income", issuedAt: dateFilter },
        _sum: { total: true },
      }),
      prisma.transaction.groupBy({
        by: ["nonDeductibleCategory"],
        where: { userId, isNonDeductible: true, issuedAt: dateFilter },
        _sum: { total: true },
        _count: true,
      }),
    ])

    const totalIncome = incomeResult._sum.total || 0

    let totalFlagged = 0
    let totalAmount = 0
    let entertainmentAmount = 0
    let charitableAmount = 0
    const byCategory: { category: string; count: number; amount: number }[] = []

    for (const group of groupedResult) {
      const cat = group.nonDeductibleCategory || "unknown"
      const amount = group._sum.total || 0
      const count = group._count

      totalFlagged += count
      totalAmount += amount

      if (cat === "entertainment") entertainmentAmount = amount
      if (cat === "charitable") charitableAmount = amount

      byCategory.push({ category: cat, count, amount })
    }

    // Compute net profit for charitable cap (simplified: income - expenses)
    const expenseResult = await prisma.transaction.aggregate({
      where: { userId, type: "expense", issuedAt: dateFilter },
      _sum: { total: true },
    })
    const netProfit = totalIncome - (expenseResult._sum.total || 0) + totalAmount

    const entertainmentCap = calculateEntertainmentCap(entertainmentAmount, totalIncome, profile.paidUpCapital)
    const charitableCap = calculateCharitableCap(charitableAmount, netProfit)

    return {
      totalFlagged,
      totalAmount,
      entertainmentAmount,
      entertainmentCap,
      charitableAmount,
      charitableCap,
      byCategory,
    }
  }
)

// --- Filing Deadline with Status ---

export const getUpcomingDeadlines = cache(
  async (userId: string): Promise<DeadlineWithStatus[]> => {
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Filing deadlines are for the PREVIOUS month's tax period
    // e.g., in March 2026, you file for February 2026 tax period
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
    const deadlines = getDeadlinesForMonth(prevMonth, prevYear)

    // Get filing statuses for these deadlines
    const statuses = await getFilingStatusesForMonth(userId, prevMonth, prevYear)
    const statusMap = new Map(
      statuses.map((s) => [`${s.formType}-${s.taxMonth}-${s.taxYear}`, s])
    )

    return deadlines.map((d) => {
      const key = `${d.formType}-${d.taxMonth}-${d.taxYear}`
      const filingStatus = statusMap.get(key)
      let status: "pending" | "filed" | "overdue" = "pending"
      if (filingStatus?.status === "filed") {
        status = "filed"
      } else if (d.adjustedDeadline < now) {
        status = "overdue"
      }
      return { deadline: d, status, filedAt: filingStatus?.filedAt ?? null }
    })
  }
)
