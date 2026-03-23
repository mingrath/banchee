/**
 * Non-Deductible Expense Validator -- Section 65 tri compliance checker.
 *
 * Post-extraction validator that confirms or overrides AI's non-deductible flags
 * using heuristic checks on category codes and Thai keywords.
 * Follows the same pattern as tax-invoice-validator.ts.
 */

export type NonDeductibleFlag = {
  isNonDeductible: boolean
  category: string
  reason: string
  severity: "warning" | "info" // warning = fully non-deductible, info = partially (caps)
}

const PENALTY_KEYWORDS = ["ค่าปรับ", "เบี้ยปรับ", "เงินเพิ่ม"]

const CATEGORY_HEURISTICS: Record<string, { category: string; reason: string; severity: "warning" | "info" }> = {
  food: {
    category: "entertainment",
    reason: "ค่ารับรอง -- รายจ่ายต้องห้ามบางส่วนตามมาตรา 65 ตรี (4) หักได้ไม่เกิน 0.3% ของรายได้ สูงสุด 10 ล้านบาท",
    severity: "info",
  },
  events: {
    category: "entertainment",
    reason: "ค่ารับรอง -- รายจ่ายต้องห้ามบางส่วนตามมาตรา 65 ตรี (4) หักได้ไม่เกิน 0.3% ของรายได้ สูงสุด 10 ล้านบาท",
    severity: "info",
  },
  donations: {
    category: "charitable",
    reason: "การบริจาค -- รายจ่ายต้องห้ามบางส่วนตามมาตรา 65 ตรี (3) หักได้ไม่เกิน 2% ของกำไรสุทธิ",
    severity: "info",
  },
}

const SEVERITY_MAP: Record<string, "warning" | "info"> = {
  penalty: "warning",
  personal: "warning",
  provision: "warning",
  no_recipient: "warning",
  cit_payment: "warning",
  capital: "warning",
  entertainment: "info",
  charitable: "info",
}

/**
 * Validate and confirm non-deductible status of an extracted expense.
 *
 * Priority:
 * 1. Heuristic checks (category + keyword) override AI flags
 * 2. AI's own is_non_deductible flag used as fallback
 * 3. Default: not non-deductible
 */
export function validateNonDeductibleExpense(
  extractedData: Record<string, unknown>
): NonDeductibleFlag {
  const categoryCode = asString(extractedData.categoryCode)
  const name = asString(extractedData.name)

  // Heuristic 1: Penalty detection -- fees category + penalty keywords
  if (categoryCode === "fees" && PENALTY_KEYWORDS.some((kw) => name.includes(kw))) {
    return {
      isNonDeductible: true,
      category: "penalty",
      reason: "ค่าปรับ -- รายจ่ายต้องห้ามตามมาตรา 65 ตรี (6)",
      severity: "warning",
    }
  }

  // Heuristic 2: Category-based flagging (entertainment, charitable)
  const categoryHeuristic = CATEGORY_HEURISTICS[categoryCode]
  if (categoryHeuristic) {
    return {
      isNonDeductible: true,
      ...categoryHeuristic,
    }
  }

  // Fallback: Use AI's own flags
  const aiFlag = extractedData.is_non_deductible === true || extractedData.is_non_deductible === "true"
  if (aiFlag) {
    const aiCategory = asString(extractedData.non_deductible_category)
    const aiReason = asString(extractedData.non_deductible_reason)
    return {
      isNonDeductible: true,
      category: aiCategory,
      reason: aiReason,
      severity: SEVERITY_MAP[aiCategory] || "warning",
    }
  }

  return {
    isNonDeductible: false,
    category: "",
    reason: "",
    severity: "info",
  }
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value).trim()
}
