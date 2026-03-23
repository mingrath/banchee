import { getSettings, updateSettings } from "@/models/settings"
import { cache } from "react"

const BUSINESS_PROFILE_CODES = [
  "biz_company_name",
  "biz_tax_id",
  "biz_branch",
  "biz_address",
  "biz_vat_registered",
  "biz_vat_reg_date",
  "biz_fiscal_year_start",
] as const

export type BusinessProfile = {
  companyName: string
  taxId: string
  branch: string
  address: string
  vatRegistered: boolean
  vatRegDate: string | null
  fiscalYearStart: number
}

const CODE_TO_KEY: Record<string, keyof BusinessProfile> = {
  biz_company_name: "companyName",
  biz_tax_id: "taxId",
  biz_branch: "branch",
  biz_address: "address",
  biz_vat_registered: "vatRegistered",
  biz_vat_reg_date: "vatRegDate",
  biz_fiscal_year_start: "fiscalYearStart",
}

export const getBusinessProfile = cache(async (userId: string): Promise<BusinessProfile> => {
  const settings = await getSettings(userId)

  return {
    companyName: settings.biz_company_name || "",
    taxId: settings.biz_tax_id || "",
    branch: settings.biz_branch || "00000",
    address: settings.biz_address || "",
    vatRegistered: settings.biz_vat_registered === "true",
    vatRegDate: settings.biz_vat_reg_date || null,
    fiscalYearStart: parseInt(settings.biz_fiscal_year_start || "1", 10),
  }
})

export async function updateBusinessProfile(
  userId: string,
  data: Partial<Record<(typeof BUSINESS_PROFILE_CODES)[number], string>>
): Promise<void> {
  for (const code of BUSINESS_PROFILE_CODES) {
    if (code in data) {
      await updateSettings(userId, code, data[code])
    }
  }
}

export async function isBusinessProfileComplete(userId: string): Promise<boolean> {
  const settings = await getSettings(userId)

  const requiredCodes = [
    "biz_company_name",
    "biz_tax_id",
    "biz_branch",
    "biz_address",
    "biz_fiscal_year_start",
  ]

  return requiredCodes.every((code) => {
    const value = settings[code]
    return value !== undefined && value !== null && value !== ""
  })
}
