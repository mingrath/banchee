"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { creditNoteFormSchema } from "@/forms/credit-note"
import { getBusinessProfile } from "@/models/business-profile"
import { extractVATFromTotal } from "@/services/tax-calculator"
import { toBuddhistYear } from "@/services/thai-date"

// --- Types ---

export type CreditNoteItem = {
  description: string
  originalAmount: number // satang
  correctedAmount: number // satang
  difference: number // satang (correctedAmount - originalAmount)
}

export type CreditNoteData = {
  id: string
  docNumber: string
  noteType: "credit" | "debit"
  issuedAt: string
  reason: string
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
  originalInvoice: {
    documentNumber: string
    issuedAt: string
    total: number // satang
  }
  items: CreditNoteItem[]
  totalDifference: number // satang (absolute)
  vatOnDifference: number // satang
  note?: string
}

// --- Create Credit/Debit Note ---

export async function createCreditNoteAction(
  prevState: ActionState<CreditNoteData> | null,
  formData: FormData
): Promise<ActionState<CreditNoteData>> {
  try {
    const user = await getCurrentUser()

    // Parse items from formData (dynamic line items)
    const itemDescriptions = formData.getAll("item_description") as string[]
    const itemOriginalAmounts = formData.getAll("item_originalAmount") as string[]
    const itemCorrectedAmounts = formData.getAll("item_correctedAmount") as string[]

    const items = itemDescriptions.map((desc, i) => ({
      description: desc,
      originalAmount: Math.round(parseFloat(itemOriginalAmounts[i] || "0") * 100), // baht to satang
      correctedAmount: Math.round(parseFloat(itemCorrectedAmounts[i] || "0") * 100), // baht to satang
    }))

    const raw = {
      originalInvoiceKey: formData.get("originalInvoiceKey") as string,
      noteType: formData.get("noteType") as string,
      issuedAt: formData.get("issuedAt") as string,
      reason: formData.get("reason") as string,
      note: (formData.get("note") as string) || undefined,
      items,
    }

    const parsed = creditNoteFormSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message }
    }

    // 1. Load business profile (seller)
    const profile = await getBusinessProfile(user.id)
    if (!profile.companyName || !profile.taxId) {
      return { success: false, error: "\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e23\u0e2d\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e18\u0e38\u0e23\u0e01\u0e34\u0e08\u0e01\u0e48\u0e2d\u0e19" }
    }

    // 2. Load original invoice from AppData
    const appDataKey = `tax-invoice-${parsed.data.originalInvoiceKey}`
    const originalAppData = await prisma.appData.findUnique({
      where: { userId_app: { userId: user.id, app: appDataKey } },
    })

    if (!originalAppData || !originalAppData.data) {
      return { success: false, error: "\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e43\u0e1a\u0e01\u0e33\u0e01\u0e31\u0e1a\u0e20\u0e32\u0e29\u0e35\u0e15\u0e49\u0e19\u0e09\u0e1a\u0e31\u0e1a" }
    }

    const originalInvoice = originalAppData.data as Record<string, unknown>

    // 3. Generate sequential document number
    const noteType = parsed.data.noteType
    const seqCode = noteType === "credit" ? "seq_credit_note" : "seq_debit_note"
    const prefix = noteType === "credit" ? "CN" : "DN"

    const nextNumber = await prisma.$transaction(async (tx) => {
      const current = await tx.setting.findFirst({
        where: { userId: user.id, code: seqCode },
      })
      const next = (parseInt(current?.value ?? "0", 10) + 1).toString()
      await tx.setting.upsert({
        where: { userId_code: { userId: user.id, code: seqCode } },
        update: { value: next },
        create: { userId: user.id, code: seqCode, name: seqCode, value: next },
      })
      return next
    })

    const issuedDate = new Date(parsed.data.issuedAt)
    const buddhistYear = toBuddhistYear(issuedDate.getFullYear())
    const docNumber = `${prefix}-${buddhistYear}-${nextNumber.padStart(4, "0")}`

    // 4. Compute totals
    const noteItems: CreditNoteItem[] = parsed.data.items.map((item) => ({
      description: item.description,
      originalAmount: item.originalAmount,
      correctedAmount: item.correctedAmount,
      difference: item.correctedAmount - item.originalAmount,
    }))

    const totalDifference = noteItems.reduce((sum, item) => sum + item.difference, 0)
    const absDifference = Math.abs(totalDifference)
    const vatResult = extractVATFromTotal(absDifference)

    // 5. Build buyer info from original invoice
    const buyerData = (originalInvoice.buyer ?? {}) as Record<string, string>

    // 6. Store in AppData
    const noteData: CreditNoteData = {
      id: "",
      docNumber,
      noteType,
      issuedAt: parsed.data.issuedAt,
      reason: parsed.data.reason,
      seller: {
        name: profile.companyName,
        taxId: profile.taxId,
        branch: profile.branch,
        address: profile.address,
      },
      buyer: {
        name: buyerData.name ?? "",
        taxId: buyerData.taxId ?? "",
        branch: buyerData.branch ?? "00000",
        address: buyerData.address ?? "",
      },
      originalInvoice: {
        documentNumber: (originalInvoice.documentNumber as string) ?? "",
        issuedAt: (originalInvoice.issuedAt as string) ?? "",
        total: (originalInvoice.total as number) ?? 0,
      },
      items: noteItems,
      totalDifference: absDifference,
      vatOnDifference: vatResult.vatAmount,
      note: parsed.data.note,
    }

    const noteAppDataKey = `credit-note-${docNumber}`
    const appData = await prisma.appData.upsert({
      where: { userId_app: { userId: user.id, app: noteAppDataKey } },
      update: { data: noteData as unknown as import("@/prisma/client").Prisma.InputJsonValue },
      create: {
        userId: user.id,
        app: noteAppDataKey,
        data: noteData as unknown as import("@/prisma/client").Prisma.InputJsonValue,
      },
    })

    noteData.id = appData.id

    // 7. Create adjustment Transaction
    // Credit note: negative adjustment (reduces revenue)
    // Debit note: positive adjustment (increases revenue)
    const adjustmentTotal = noteType === "credit" ? -absDifference : absDifference
    const adjustmentVat = noteType === "credit" ? -vatResult.vatAmount : vatResult.vatAmount
    const adjustmentSubtotal = noteType === "credit" ? -vatResult.subtotal : vatResult.subtotal

    await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "income",
        name: `${noteType === "credit" ? "\u0e43\u0e1a\u0e25\u0e14\u0e2b\u0e19\u0e35\u0e49" : "\u0e43\u0e1a\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2b\u0e19\u0e35\u0e49"} ${docNumber}`,
        merchant: buyerData.name ?? null,
        total: adjustmentTotal,
        subtotal: adjustmentSubtotal,
        vatType: "output",
        vatAmount: adjustmentVat,
        vatRate: 700,
        documentNumber: docNumber,
        issuedAt: issuedDate,
        currencyCode: "THB",
      },
    })

    return { success: true, data: noteData }
  } catch (error) {
    console.error("Failed to create credit/debit note:", error)
    return { success: false, error: "\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e43\u0e1a\u0e25\u0e14\u0e2b\u0e19\u0e35\u0e49/\u0e43\u0e1a\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e2b\u0e19\u0e35\u0e49\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 -- \u0e01\u0e23\u0e38\u0e13\u0e32\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07" }
  }
}

export async function createDebitNoteAction(
  prevState: ActionState<CreditNoteData> | null,
  formData: FormData
): Promise<ActionState<CreditNoteData>> {
  formData.set("noteType", "debit")
  return createCreditNoteAction(prevState, formData)
}
