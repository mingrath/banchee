/**
 * Bank Statement Parser Service
 *
 * Handles CSV/Excel parsing with Thai encoding detection (UTF-8/TIS-620),
 * Buddhist Era date normalization, and baht-to-satang conversion at import boundary.
 *
 * All amounts are converted to satang integers at parse time -- never store baht floats.
 */

import { parseString } from "@fast-csv/parse"
import ExcelJS from "exceljs"
import crypto from "crypto"
import { BANK_PRESETS, type ColumnMapping } from "./bank-constants"

export { BANK_PRESETS, type ColumnMapping } from "./bank-constants"

// ─── Types ─────────────────────────────────────────────────────

export type ParsedBankEntry = {
  date: Date
  description: string
  deposit: number    // satang (0 if withdrawal)
  withdrawal: number // satang (0 if deposit)
  balance: number | null // satang
  reference: string | null
}

// ─── Encoding Detection ────────────────────────────────────────

/**
 * Detect if a buffer is TIS-620 encoded.
 * Check: try UTF-8 decode, look for Thai Unicode range (0x0E00-0x0E7F).
 * If no Thai chars found but buffer has bytes in 0xA1-0xFB range, it is TIS-620.
 */
export function detectEncoding(buffer: Buffer): "utf-8" | "windows-874" {
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(buffer)
  const hasThaiUnicode = /[\u0E00-\u0E7F]/.test(utf8Text)
  if (hasThaiUnicode) return "utf-8"

  // Check for TIS-620 byte range (Thai chars are 0xA1-0xFB in TIS-620)
  const hasTIS620Bytes = buffer.some((b) => b >= 0xA1 && b <= 0xFB)
  if (hasTIS620Bytes) return "windows-874"

  return "utf-8" // default for plain ASCII
}

// ─── Year Normalization ────────────────────────────────────────

/**
 * Convert B.E. year to Gregorian if needed.
 * B.E. years are > 2400 (e.g., 2569 -> 2026).
 */
export function normalizeYear(year: number): number {
  return year > 2400 ? year - 543 : year
}

// ─── Amount Conversion ─────────────────────────────────────────

/**
 * Convert baht string to satang integer at import boundary.
 * Handles comma-separated Thai number formats: "1,234.56" -> 123456
 */
export function bahtToSatang(value: string): number {
  const cleaned = value.replace(/[,\s]/g, "")
  const num = parseFloat(cleaned)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

// ─── CSV Parsing ───────────────────────────────────────────────

/**
 * Parse a CSV buffer into string[][] rows.
 * Auto-detects encoding (UTF-8 or TIS-620).
 */
export async function parseCSVBuffer(
  buffer: Buffer,
  skipLines: number = 0
): Promise<string[][]> {
  const encoding = detectEncoding(buffer)
  const text = new TextDecoder(encoding).decode(buffer)

  return new Promise((resolve, reject) => {
    const rows: string[][] = []
    parseString(text, {
      headers: false,
      skipLines,
      ignoreEmpty: true,
      trim: true,
    })
      .on("data", (row: string[]) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (err: Error) => reject(err))
  })
}

// ─── Excel Parsing ─────────────────────────────────────────────

/**
 * Parse an Excel workbook buffer into string[][] rows.
 * Reads the first worksheet only.
 */
export async function parseExcelBuffer(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) throw new Error("No worksheet found")

  const rows: string[][] = []
  worksheet.eachRow((_row) => {
    const values = _row.values as (string | number | Date | null)[]
    // ExcelJS row.values is 1-indexed (index 0 is empty)
    const cells = values.slice(1).map((v) => {
      if (v instanceof Date) return v.toISOString()
      if (v === null || v === undefined) return ""
      return String(v)
    })
    rows.push(cells)
  })
  return rows
}

// ─── Bank Entry Extraction ─────────────────────────────────────

/**
 * Parse a DD/MM/YYYY date string, optionally normalizing B.E. year.
 */
function parseDateString(dateStr: string, useBuddhistEra: boolean): Date {
  // Try DD/MM/YYYY format first
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10)
    const month = parseInt(ddmmyyyy[2], 10)
    let year = parseInt(ddmmyyyy[3], 10)
    if (useBuddhistEra) {
      year = normalizeYear(year)
    }
    return new Date(year, month - 1, day)
  }

  // Try YYYY-MM-DD format
  const yyyymmdd = dateStr.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/)
  if (yyyymmdd) {
    let year = parseInt(yyyymmdd[1], 10)
    const month = parseInt(yyyymmdd[2], 10)
    const day = parseInt(yyyymmdd[3], 10)
    if (useBuddhistEra) {
      year = normalizeYear(year)
    }
    return new Date(year, month - 1, day)
  }

  // Fallback: try native Date parsing
  return new Date(dateStr)
}

/**
 * Apply column mapping to raw rows and extract ParsedBankEntry[].
 * Converts amounts to satang via bahtToSatang.
 * Normalizes dates via normalizeYear if B.E.
 */
export function parseBankEntries(
  rows: string[][],
  mapping: ColumnMapping,
  useBuddhistEra: boolean
): ParsedBankEntry[] {
  return rows.map((row) => {
    const dateStr = row[mapping.date] || ""
    const description = row[mapping.description] || ""
    const depositStr = mapping.deposit !== null ? (row[mapping.deposit] || "") : ""
    const withdrawalStr = mapping.withdrawal !== null ? (row[mapping.withdrawal] || "") : ""
    const balanceStr = mapping.balance !== null ? (row[mapping.balance] || "") : ""
    const referenceStr = mapping.reference !== null ? (row[mapping.reference] || "") : ""

    return {
      date: parseDateString(dateStr, useBuddhistEra),
      description,
      deposit: bahtToSatang(depositStr),
      withdrawal: bahtToSatang(withdrawalStr),
      balance: mapping.balance !== null ? bahtToSatang(balanceStr) : null,
      reference: mapping.reference !== null ? (referenceStr || null) : null,
    }
  })
}

// ─── File Hash Generation ──────────────────────────────────────

/**
 * Generate a consistent hash for duplicate detection.
 * Uses first 2000 bytes + buffer length for performance.
 */
export function generateFileHash(buffer: Buffer): string {
  const sample = buffer.subarray(0, 2000)
  const hash = crypto.createHash("sha256")
  hash.update(sample)
  hash.update(Buffer.from(String(buffer.length)))
  return hash.digest("hex")
}

// ─── Bank Presets ──────────────────────────────────────────────

// BANK_PRESETS moved to ./bank-constants.ts for client-safe imports
// Re-exported at the top of this file for backward compatibility
