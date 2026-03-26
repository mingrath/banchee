import { z } from "zod"

export const invoiceFormSchema = z.object({
  contactId: z.string().min(1, "กรุณาเลือกผู้ซื้อ / ผู้ติดต่อ"),
  issuedAt: z.string().min(1, "กรุณากรอกวันที่ออกเอกสาร"),
  dueDate: z.string().min(1, "กรุณากรอกวันครบกำหนดชำระ"),
  paymentTerms: z.string().optional().default(""),
  includeVat: z.string().optional().default("false"),
  overallDiscount: z.coerce.number().min(0).default(0),
  note: z.string().optional().default(""),
})

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>
