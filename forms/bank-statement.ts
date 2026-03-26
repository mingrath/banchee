import { z } from "zod"

export const columnMappingSchema = z.object({
  date: z.coerce.number().int().min(0),
  description: z.coerce.number().int().min(0),
  deposit: z.coerce.number().int().min(0).nullable(),
  withdrawal: z.coerce.number().int().min(0).nullable(),
  balance: z.coerce.number().int().min(0).nullable(),
  reference: z.coerce.number().int().min(0).nullable(),
}).refine((data) => data.deposit !== null || data.withdrawal !== null, {
  message: "At least one of deposit or withdrawal column is required",
})

export const importBankStatementSchema = z.object({
  bankName: z.enum(["kbank", "scb", "bbl", "other"]),
  skipLines: z.coerce.number().int().min(0).default(1),
})

export type ColumnMappingValues = z.infer<typeof columnMappingSchema>
export type ImportBankStatementValues = z.infer<typeof importBankStatementSchema>
