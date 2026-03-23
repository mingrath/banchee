import { z } from "zod"

export const contactFormSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อ").max(256),
  taxId: z
    .string()
    .length(13, "เลขประจำตัวผู้เสียภาษีต้องเป็น 13 หลัก")
    .regex(/^\d{13}$/, "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลขเท่านั้น"),
  branch: z.string().default("00000"),
  address: z.string().min(1, "กรุณากรอกที่อยู่").max(512),
  type: z.enum(["vendor", "customer", "both"]).default("vendor"),
})

export type ContactFormData = z.infer<typeof contactFormSchema>
