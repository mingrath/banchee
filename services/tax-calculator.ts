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

// ─── CIT (Corporate Income Tax) ──────────────────────────────

/**
 * SME tiered rate thresholds (all in satang).
 */
export const SME_TIER_1_LIMIT = 30000000    // 300,000 THB
export const SME_TIER_2_LIMIT = 300000000   // 3,000,000 THB
export const SME_CAPITAL_LIMIT = 500000000  // 5,000,000 THB
export const SME_REVENUE_LIMIT = 3000000000 // 30,000,000 THB
export const ENTERTAINMENT_HARD_CAP = 1000000000 // 10,000,000 THB

export type CITTier = {
  from: number
  to: number
  rate: number
  taxableAmount: number
  tax: number
}

export type CITResult = {
  netProfit: number
  isEligible: boolean
  tiers: CITTier[]
  totalCIT: number
  effectiveRate: number // basis points (1050 = 10.50%)
}

export type EntertainmentCapResult = {
  actualAmount: number
  revenueBase: number
  capitalBase: number
  capBase: number
  hardCap: number
  deductibleAmount: number
  nonDeductibleAmount: number
  status: "under" | "approaching" | "over"
}

export type CharitableCapResult = {
  actualAmount: number
  netProfitBase: number
  cap: number
  deductibleAmount: number
  nonDeductibleAmount: number
  status: "under" | "approaching" | "over"
}

/**
 * Determine SME eligibility based on paid-up capital and annual revenue.
 * Both thresholds must be met (BOTH must be at or below limits).
 */
export function isSMEEligible(paidUpCapital: number, annualRevenue: number): boolean {
  return paidUpCapital <= SME_CAPITAL_LIMIT && annualRevenue <= SME_REVENUE_LIMIT
}

/**
 * Calculate CIT using SME progressive rates.
 * Tiers: 0% on first 300K, 15% on 300K-3M, 20% above 3M.
 * All amounts in satang.
 */
export function calculateSMECIT(netProfitSatang: number): CITResult {
  if (netProfitSatang <= 0) {
    return {
      netProfit: netProfitSatang,
      isEligible: true,
      tiers: [
        { from: 0, to: SME_TIER_1_LIMIT, rate: 0, taxableAmount: 0, tax: 0 },
        { from: SME_TIER_1_LIMIT, to: SME_TIER_2_LIMIT, rate: 1500, taxableAmount: 0, tax: 0 },
        { from: SME_TIER_2_LIMIT, to: Infinity, rate: 2000, taxableAmount: 0, tax: 0 },
      ],
      totalCIT: 0,
      effectiveRate: 0,
    }
  }

  // Tier 1: 0% on first 300K
  const tier1Amount = Math.min(netProfitSatang, SME_TIER_1_LIMIT)
  const tier1Tax = 0

  // Tier 2: 15% on 300K to 3M
  const tier2Amount = Math.max(0, Math.min(netProfitSatang, SME_TIER_2_LIMIT) - SME_TIER_1_LIMIT)
  const tier2Tax = Math.round(tier2Amount * 1500 / 10000)

  // Tier 3: 20% above 3M
  const tier3Amount = Math.max(0, netProfitSatang - SME_TIER_2_LIMIT)
  const tier3Tax = Math.round(tier3Amount * 2000 / 10000)

  const totalCIT = tier1Tax + tier2Tax + tier3Tax
  const effectiveRate = netProfitSatang > 0 ? Math.round(totalCIT * 10000 / netProfitSatang) : 0

  return {
    netProfit: netProfitSatang,
    isEligible: true,
    tiers: [
      { from: 0, to: SME_TIER_1_LIMIT, rate: 0, taxableAmount: tier1Amount, tax: tier1Tax },
      { from: SME_TIER_1_LIMIT, to: SME_TIER_2_LIMIT, rate: 1500, taxableAmount: tier2Amount, tax: tier2Tax },
      { from: SME_TIER_2_LIMIT, to: Infinity, rate: 2000, taxableAmount: tier3Amount, tax: tier3Tax },
    ],
    totalCIT,
    effectiveRate,
  }
}

/**
 * Calculate CIT at flat 20% rate (non-SME entities).
 * All amounts in satang.
 */
export function calculateFlatCIT(netProfitSatang: number): CITResult {
  if (netProfitSatang <= 0) {
    return {
      netProfit: netProfitSatang,
      isEligible: false,
      tiers: [{ from: 0, to: Infinity, rate: 2000, taxableAmount: 0, tax: 0 }],
      totalCIT: 0,
      effectiveRate: 0,
    }
  }

  const totalCIT = Math.round(netProfitSatang * 2000 / 10000)

  return {
    netProfit: netProfitSatang,
    isEligible: false,
    tiers: [{ from: 0, to: Infinity, rate: 2000, taxableAmount: netProfitSatang, tax: totalCIT }],
    totalCIT,
    effectiveRate: 2000,
  }
}

/**
 * Calculate entertainment expense cap per Section 65 tri (4).
 * Cap = MAX(revenue * 0.003, capital * 0.003), hard cap 10M THB.
 * All amounts in satang.
 */
export function calculateEntertainmentCap(
  actualEntertainment: number,
  totalRevenue: number,
  paidUpCapital: number
): EntertainmentCapResult {
  const revenueBase = Math.round(totalRevenue * 30 / 10000) // 0.3% = 30 basis points
  const capitalBase = Math.round(paidUpCapital * 30 / 10000)
  const capBase = Math.max(revenueBase, capitalBase)
  const deductibleCap = Math.min(capBase, ENTERTAINMENT_HARD_CAP)
  const deductibleAmount = Math.min(actualEntertainment, deductibleCap)
  const nonDeductibleAmount = Math.max(0, actualEntertainment - deductibleCap)

  let status: "under" | "approaching" | "over"
  if (deductibleCap <= 0) {
    status = actualEntertainment > 0 ? "over" : "under"
  } else {
    const ratio = actualEntertainment / deductibleCap
    if (ratio >= 1) {
      status = "over"
    } else if (ratio >= 0.8) {
      status = "approaching"
    } else {
      status = "under"
    }
  }

  return {
    actualAmount: actualEntertainment,
    revenueBase,
    capitalBase,
    capBase,
    hardCap: ENTERTAINMENT_HARD_CAP,
    deductibleAmount,
    nonDeductibleAmount,
    status,
  }
}

/**
 * Calculate charitable expense cap per Section 65 tri (3).
 * Cap = 2% of net profit before charitable deduction.
 * All amounts in satang.
 */
export function calculateCharitableCap(
  actualCharitable: number,
  netProfitBeforeCharity: number
): CharitableCapResult {
  const cap = Math.max(0, Math.round(netProfitBeforeCharity * 200 / 10000)) // 2% = 200 basis points
  const deductibleAmount = Math.min(actualCharitable, cap)
  const nonDeductibleAmount = Math.max(0, actualCharitable - cap)

  let status: "under" | "approaching" | "over"
  if (cap <= 0) {
    status = actualCharitable > 0 ? "over" : "under"
  } else {
    const ratio = actualCharitable / cap
    if (ratio >= 1) {
      status = "over"
    } else if (ratio >= 0.8) {
      status = "approaching"
    } else {
      status = "under"
    }
  }

  return {
    actualAmount: actualCharitable,
    netProfitBase: netProfitBeforeCharity,
    cap,
    deductibleAmount,
    nonDeductibleAmount,
    status,
  }
}
