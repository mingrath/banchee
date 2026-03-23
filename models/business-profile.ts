import { prisma } from "@/lib/db"
import { cache } from "react"

export const BUSINESS_PROFILE_CODES = [
  "biz_company_name",
  "biz_tax_id",
  "biz_branch",
  "biz_address",
  "biz_vat_registered",
  "biz_vat_reg_date",
  "biz_fiscal_year_start",
  "biz_paid_up_capital",
] as const

export type BusinessProfileCode = (typeof BUSINESS_PROFILE_CODES)[number]

export type BusinessProfile = {
  companyName: string
  taxId: string
  branch: string
  address: string
  vatRegistered: boolean
  vatRegDate: string | null
  fiscalYearStart: number
  paidUpCapital: number // satang, 0 = not set
}

const FIELD_TO_CODE: Record<keyof BusinessProfile, BusinessProfileCode> = {
  companyName: "biz_company_name",
  taxId: "biz_tax_id",
  branch: "biz_branch",
  address: "biz_address",
  vatRegistered: "biz_vat_registered",
  vatRegDate: "biz_vat_reg_date",
  fiscalYearStart: "biz_fiscal_year_start",
  paidUpCapital: "biz_paid_up_capital",
}

const DEFAULT_PROFILE: BusinessProfile = {
  companyName: "",
  taxId: "",
  branch: "00000",
  address: "",
  vatRegistered: false,
  vatRegDate: null,
  fiscalYearStart: 1,
  paidUpCapital: 0,
}

/**
 * Get the business profile for a user from the Settings model.
 * Returns default values for any missing settings.
 */
export const getBusinessProfile = cache(async (userId: string): Promise<BusinessProfile> => {
  const settings = await prisma.setting.findMany({
    where: {
      userId,
      code: { in: [...BUSINESS_PROFILE_CODES] },
    },
  })

  const settingsMap = new Map(settings.map((s) => [s.code, s.value || ""]))

  return {
    companyName: settingsMap.get("biz_company_name") || DEFAULT_PROFILE.companyName,
    taxId: settingsMap.get("biz_tax_id") || DEFAULT_PROFILE.taxId,
    branch: settingsMap.get("biz_branch") || DEFAULT_PROFILE.branch,
    address: settingsMap.get("biz_address") || DEFAULT_PROFILE.address,
    vatRegistered: settingsMap.get("biz_vat_registered") === "true",
    vatRegDate: settingsMap.get("biz_vat_reg_date") || DEFAULT_PROFILE.vatRegDate,
    fiscalYearStart: parseInt(settingsMap.get("biz_fiscal_year_start") || "1", 10),
    paidUpCapital: parseInt(settingsMap.get("biz_paid_up_capital") || "0", 10),
  }
})

/**
 * Update the business profile for a user.
 * Only updates fields that are provided in the data parameter.
 */
export async function updateBusinessProfile(userId: string, data: Partial<BusinessProfile>): Promise<void> {
  const updates: Array<{ code: string; value: string }> = []

  for (const [field, value] of Object.entries(data)) {
    const code = FIELD_TO_CODE[field as keyof BusinessProfile]
    if (!code) continue

    let stringValue: string
    if (typeof value === "boolean") {
      stringValue = value ? "true" : "false"
    } else if (typeof value === "number") {
      stringValue = String(value)
    } else if (value === null) {
      stringValue = ""
    } else {
      stringValue = String(value)
    }

    updates.push({ code, value: stringValue })
  }

  for (const { code, value } of updates) {
    await prisma.setting.upsert({
      where: { userId_code: { code, userId } },
      update: { value },
      create: {
        code,
        name: code,
        value,
        userId,
      },
    })
  }
}

/**
 * Check if the business profile has all required fields filled.
 * Required: company name, tax ID, branch, address.
 */
export async function isBusinessProfileComplete(userId: string): Promise<boolean> {
  const requiredCodes = ["biz_company_name", "biz_tax_id", "biz_branch", "biz_address"]

  const settings = await prisma.setting.findMany({
    where: {
      userId,
      code: { in: requiredCodes },
    },
  })

  if (settings.length < requiredCodes.length) {
    return false
  }

  return settings.every((s) => s.value && s.value.trim().length > 0)
}
