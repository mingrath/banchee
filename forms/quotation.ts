import { z } from "zod"

export const quotationFormSchema = z.object({
  contactId: z.string().min(1, "กรุณาเลือกผู้ซื้อ / ผู้ติดต่อ"),
  issuedAt: z.string().min(1, "กรุณากรอกวันที่ออกเอกสาร"),
  validityDays: z.coerce.number().min(1, "ระยะเวลาต้องอย่างน้อย 1 วัน"),
  paymentTerms: z.string().optional().default(""),
  includeVat: z.string().optional().default("false"),
  overallDiscount: z.coerce.number().min(0).default(0),
  note: z.string().optional().default(""),
})

export type QuotationFormValues = z.infer<typeof quotationFormSchema>
