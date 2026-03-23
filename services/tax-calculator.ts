/**
 * Thai VAT Calculator — Pure functions using satang integer arithmetic.
 *
 * All monetary amounts are in satang (1 baht = 100 satang).
 * Rates are in basis points (700 = 7.00%).
 * No floating-point arithmetic to avoid rounding errors.
 */

export const VAT_RATE = 700 // 7.00% in basis points

export type VATResult = {
  subtotal: number // pre-VAT base amount in satang
  vatAmount: number // VAT portion in satang
  total: number // subtotal + vatAmount in satang
}

/**
 * Extract VAT from a VAT-inclusive total (the /107 method).
 *
 * Formula: subtotal = Math.round(total * 10000 / (10000 + rate))
 * This avoids floating-point by keeping everything in integer domain.
 *
 * Example: extractVATFromTotal(107000) => { subtotal: 100000, vatAmount: 7000, total: 107000 }
 */
export function extractVATFromTotal(totalInclVAT: number, vatRate: number = VAT_RATE): VATResult {
  if (totalInclVAT === 0) {
    return { subtotal: 0, vatAmount: 0, total: 0 }
  }

  const subtotal = Math.round(totalInclVAT * 10000 / (10000 + vatRate))
  const vatAmount = totalInclVAT - subtotal

  return {
    subtotal,
    vatAmount,
    total: totalInclVAT,
  }
}

/**
 * Compute VAT on a pre-VAT subtotal.
 *
 * Formula: vatAmount = Math.round(subtotal * rate / 10000)
 *
 * Example: computeVATOnSubtotal(100000) => { subtotal: 100000, vatAmount: 7000, total: 107000 }
 */
export function computeVATOnSubtotal(subtotal: number, vatRate: number = VAT_RATE): VATResult {
  if (subtotal === 0) {
    return { subtotal: 0, vatAmount: 0, total: 0 }
  }

  const vatAmount = Math.round(subtotal * vatRate / 10000)
  const total = subtotal + vatAmount

  return {
    subtotal,
    vatAmount,
    total,
  }
}

/**
 * Convert satang to baht for display purposes only.
 * Do NOT use this for calculations -- always compute in satang.
 */
export function formatSatangToDisplay(satang: number): number {
  return satang / 100
}

// ─── WHT (Withholding Tax) ────────────────────────────────────

/**
 * WHT rate constants (basis points, matching VAT_RATE convention).
 * 100 basis points = 1%.
 */
export const WHT_RATES = {
  TRANSPORT: 100,    // 1%
  INSURANCE: 100,    // 1%
  ADVERTISING: 200,  // 2%
  SERVICE: 300,      // 3% (most common)
  ROYALTY: 300,      // 3%
  RENT: 500,         // 5%
  DIVIDEND: 1000,    // 10%
} as const

export const WHT_RATE_OPTIONS = [
  { rate: 100,  label: "1% - ค่าขนส่ง / เบี้ยประกันวินาศภัย", types: ["transport", "insurance"] },
  { rate: 200,  label: "2% - ค่าโฆษณา", types: ["advertising"] },
  { rate: 300,  label: "3% - ค่าบริการ / ค่าจ้างทำของ / ค่าลิขสิทธิ์", types: ["service", "royalty", "commission"] },
  { rate: 500,  label: "5% - ค่าเช่า / รางวัล", types: ["rent", "prize"] },
  { rate: 1000, label: "10% - เงินปันผล", types: ["dividend"] },
] as const

/** WHT threshold: 1,000 THB = 100,000 satang */
export const WHT_THRESHOLD = 100000

export type WHTResult = {
  subtotal: number   // pre-VAT base (satang)
  whtAmount: number  // WHT withheld (satang)
  whtRate: number    // rate in basis points
  netPayable: number // total - whtAmount
}

/**
 * Calculate WHT on a pre-VAT subtotal.
 *
 * CRITICAL: WHT is calculated on the pre-VAT amount (subtotal), NEVER on VAT-inclusive total.
 * If subtotal < WHT_THRESHOLD (1,000 THB), WHT is zero per Revenue Dept rules.
 *
 * @param subtotal - pre-VAT amount in satang
 * @param whtRate - rate in basis points (300 = 3%)
 * @param vatInclusiveTotal - VAT-inclusive total for netPayable calculation
 */
export function calculateWHT(
  subtotal: number,
  whtRate: number,
  vatInclusiveTotal: number
): WHTResult {
  if (subtotal === 0 || whtRate === 0 || subtotal < WHT_THRESHOLD) {
    return { subtotal, whtAmount: 0, whtRate, netPayable: vatInclusiveTotal }
  }
  const whtAmount = Math.round(subtotal * whtRate / 10000)
  return { subtotal, whtAmount, whtRate, netPayable: vatInclusiveTotal - whtAmount }
}

/**
 * Compute WHT from a VAT-inclusive total.
 *
 * Chains extractVATFromTotal (to get pre-VAT base) then calculateWHT.
 * This is the primary entry point for receipt scanning where total is known.
 */
export function computeWHTFromTotal(
  totalInclVAT: number,
  whtRate: number,
  vatRate: number = VAT_RATE
): WHTResult & VATResult {
  const vat = extractVATFromTotal(totalInclVAT, vatRate)
  const wht = calculateWHT(vat.subtotal, whtRate, totalInclVAT)
  return { ...vat, ...wht }
}
