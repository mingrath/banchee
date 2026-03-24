"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { taxInvoiceFormSchema } from "@/forms/tax-invoice"
import { getBusinessProfile } from "@/models/business-profile"
import { getContactById } from "@/models/contacts"
import { computeVATOnSubtotal } from "@/services/tax-calculator"
import { toBuddhistYear } from "@/services/thai-date"

export type TaxInvoiceItem = {
  description: string
  quantity: number
  unitPrice: number // satang
  amount: number // satang (quantity * unitPrice)
}

export type TaxInvoiceData = {
  id: string
  documentNumber: string
  issuedAt: string
  seller: {
    name: string
    taxId: string
    branch: string
    address: string
  }
  buyer: {
    name: string
    taxId: string
    branch: string
    address: string
  }
  items: TaxInvoiceItem[]
  subtotal: number // satang
  vatAmount: number // satang
  total: number // satang
  note?: string
}

export async function createTaxInvoiceAction(
  prevState: ActionState<TaxInvoiceData> | null,
  formData: FormData
): Promise<ActionState<TaxInvoiceData>> {
  try {
    const user = await getCurrentUser()

    // Parse items from formData (dynamic line items)
    const itemDescriptions = formData.getAll("item_description") as string[]
    const itemQuantities = formData.getAll("item_quantity") as string[]
    const itemUnitPrices = formData.getAll("item_unitPrice") as string[]

    const items = itemDescriptions.map((desc, i) => ({
      description: desc,
      quantity: parseFloat(itemQuantities[i] || "0"),
      unitPrice: Math.round(parseFloat(itemUnitPrices[i] || "0") * 100), // convert baht to satang
    }))

    const raw = {
      contactId: formData.get("contactId") as string,
      issuedAt: formData.get("issuedAt") as string,
      note: (formData.get("note") as string) || undefined,
      items,
    }

    const parsed = taxInvoiceFormSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message }
    }

    // 1. Load business profile (seller info -- fields 2, 8)
    const profile = await getBusinessProfile(user.id)
    if (!profile.companyName || !profile.taxId) {
      return { success: false, error: "กรุณากรอกข้อมูลธุรกิจก่อน" }
    }

    // 2. Load contact (buyer info -- field 3)
    const contact = await getContactById(user.id, parsed.data.contactId)
    if (!contact) {
      return { success: false, error: "ไม่พบผู้ซื้อ" }
    }

    // 3. Compute totals (items are already in satang)
    const subtotal = parsed.data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    )
    const vatResult = computeVATOnSubtotal(subtotal)

    // 4. Generate sequential number (per INV-02)
    // IMPORTANT: Setting.value is a String field. Use explicit read-parse-increment-save
    // pattern inside prisma.$transaction for atomicity. Do NOT use { increment: 1 }.
    const nextNumber = await prisma.$transaction(async (tx) => {
      const current = await tx.setting.findFirst({
        where: { userId: user.id, code: "seq_tax_invoice" },
      })
      const next = (parseInt(current?.value ?? "0", 10) + 1).toString()
      await tx.setting.upsert({
        where: {
          userId_code: { userId: user.id, code: "seq_tax_invoice" },
        },
        update: { value: next },
        create: {
          userId: user.id,
          code: "seq_tax_invoice",
          name: "seq_tax_invoice",
          value: next,
        },
      })
      return next
    })

    // Format: INV-YYYY-NNNN (Buddhist Era year)
    const issuedDate = new Date(parsed.data.issuedAt)
    const buddhistYear = toBuddhistYear(issuedDate.getFullYear())
    const documentNumber = `INV-${buddhistYear}-${nextNumber.padStart(4, "0")}`

    // 5. Build items with computed amounts
    const invoiceItems: TaxInvoiceItem[] = parsed.data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: item.quantity * item.unitPrice,
    }))

    // 6. Store invoice data in AppData for PDF regeneration
    const invoiceData: TaxInvoiceData = {
      id: "", // will be set after AppData creation
      documentNumber,
      issuedAt: parsed.data.issuedAt,
      seller: {
        name: profile.companyName,
        taxId: profile.taxId,
        branch: profile.branch,
        address: profile.address,
      },
      buyer: {
        name: contact.name,
        taxId: contact.taxId,
        branch: contact.branch,
        address: contact.address,
      },
      items: invoiceItems,
      subtotal: vatResult.subtotal,
      vatAmount: vatResult.vatAmount,
      total: vatResult.total,
      note: parsed.data.note,
    }

    // Store in AppData with unique key per invoice
    const appDataKey = `tax-invoice-${documentNumber}`
    const appData = await prisma.appData.upsert({
      where: {
        userId_app: { userId: user.id, app: appDataKey },
      },
      update: { data: invoiceData as unknown as import("@/prisma/client").Prisma.InputJsonValue },
      create: {
        userId: user.id,
        app: appDataKey,
        data: invoiceData as unknown as import("@/prisma/client").Prisma.InputJsonValue,
      },
    })

    invoiceData.id = appData.id

    // 7. Auto-create income Transaction (per D-06)
    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "income",
        name: `ใบกำกับภาษี ${documentNumber}`,
        merchant: contact.name,
        total: vatResult.total,
        subtotal: vatResult.subtotal,
        vatType: "output",
        vatAmount: vatResult.vatAmount,
        vatRate: 700,
        merchantTaxId: contact.taxId,
        merchantBranch: contact.branch,
        documentNumber,
        contactId: contact.id,
        issuedAt: issuedDate,
        currencyCode: "THB",
        items: JSON.stringify(invoiceItems),
      },
    })

    return { success: true, data: invoiceData }
  } catch (error) {
    console.error("Failed to create tax invoice:", error)
    return { success: false, error: "สร้างใบกำกับภาษีไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง" }
  }
}
