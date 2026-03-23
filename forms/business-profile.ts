import { z } from "zod"

export const businessProfileSchema = z.object({
  biz_company_name: z.string().min(2),
  biz_tax_id: z.string().regex(/^\d{13}$/),
  biz_branch: z.string().min(1),
  biz_address: z.string().min(1),
  biz_vat_registered: z.enum(["true", "false"]),
  biz_vat_reg_date: z.string().optional(),
  biz_fiscal_year_start: z.string().regex(/^(1[0-2]|[1-9])$/),
})

export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>
