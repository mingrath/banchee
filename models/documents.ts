import { prisma } from "@/lib/db"
import {
  assertValidTransition,
  formatDocumentNumber,
  getCounterKey,
  DOCUMENT_PREFIXES,
} from "@/services/document-workflow"
import { toBuddhistYear } from "@/services/thai-date"

export type CreateDocumentInput = {
  documentType: string
  contactId?: string | null
  issuedAt?: Date | null
  validUntil?: Date | null
  paymentTerms?: string | null
  sourceDocumentId?: string | null
  dueDate?: Date | null
  paymentMethod?: string | null
  paymentDate?: Date | null
  paidAmount?: number | null  // satang
  subtotal: number
  discountAmount: number
  vatRate: number
  vatAmount: number
  total: number
  items: unknown[]
  sellerData?: unknown
  buyerData?: unknown
  note?: string | null
}

/**
 * Create a new document with an auto-generated sequential number.
 * Uses prisma.$transaction for atomic counter increment.
 */
export async function createDocument(userId: string, input: CreateDocumentInput) {
  const now = new Date()
  const gregorianYear = now.getFullYear()
  const buddhistYear = toBuddhistYear(gregorianYear)
  const prefix =
    DOCUMENT_PREFIXES[input.documentType as keyof typeof DOCUMENT_PREFIXES] ||
    input.documentType
  const counterKey = getCounterKey(prefix, buddhistYear)

  return prisma.$transaction(async (tx) => {
    const current = await tx.setting.findFirst({
      where: { userId, code: counterKey },
    })
    const nextSeq = parseInt(current?.value ?? "0", 10) + 1
    await tx.setting.upsert({
      where: { userId_code: { userId, code: counterKey } },
      update: { value: nextSeq.toString() },
      create: {
        userId,
        code: counterKey,
        name: counterKey,
        value: nextSeq.toString(),
      },
    })
    const documentNumber = formatDocumentNumber(prefix, buddhistYear, nextSeq)

    return tx.document.create({
      data: {
        userId,
        documentType: input.documentType,
        documentNumber,
        status: "draft",
        contactId: input.contactId ?? null,
        issuedAt: input.issuedAt ?? now,
        validUntil: input.validUntil ?? null,
        paymentTerms: input.paymentTerms ?? null,
        sourceDocumentId: input.sourceDocumentId ?? null,
        dueDate: input.dueDate ?? null,
        paymentMethod: input.paymentMethod ?? null,
        paymentDate: input.paymentDate ?? null,
        paidAmount: input.paidAmount ?? null,
        subtotal: input.subtotal,
        discountAmount: input.discountAmount,
        vatRate: input.vatRate,
        vatAmount: input.vatAmount,
        total: input.total,
        items: input.items as unknown[],
        sellerData: (input.sellerData as object) ?? null,
        buyerData: (input.buyerData as object) ?? null,
        note: input.note ?? null,
      },
    })
  })
}

/**
 * Get a single document by ID, scoped to the given user.
 */
export async function getDocumentById(userId: string, documentId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, userId },
  })
}

/**
 * List documents for a user with optional filters.
 */
export async function listDocuments(
  userId: string,
  filters?: {
    documentType?: string
    status?: string
    limit?: number
    offset?: number
  }
) {
  return prisma.document.findMany({
    where: {
      userId,
      ...(filters?.documentType
        ? { documentType: filters.documentType }
        : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit,
    skip: filters?.offset,
  })
}

/**
 * Update a document's status, enforcing the state machine.
 * Throws if the transition is invalid.
 */
export async function updateDocumentStatus(
  userId: string,
  documentId: string,
  newStatus: string
) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId },
  })
  if (!doc) throw new Error("Document not found")
  assertValidTransition(doc.documentType, doc.status, newStatus)
  return prisma.document.update({
    where: { id: documentId },
    data: { status: newStatus },
  })
}

/**
 * Create a new document from a source document, copying all data.
 * Runs inside a $transaction for atomic sequential numbering.
 * Does NOT update source status — caller handles that to keep this function reusable.
 */
export async function createDocumentFromSource(
  userId: string,
  sourceDocumentId: string,
  targetType: string,
  overrides?: Partial<CreateDocumentInput>
) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.document.findFirst({
      where: { id: sourceDocumentId, userId },
    })
    if (!source) throw new Error("Document not found")

    const now = new Date()
    const gregorianYear = now.getFullYear()
    const buddhistYear = toBuddhistYear(gregorianYear)
    const prefix =
      DOCUMENT_PREFIXES[targetType as keyof typeof DOCUMENT_PREFIXES] || targetType
    const counterKey = getCounterKey(prefix, buddhistYear)

    const current = await tx.setting.findFirst({
      where: { userId, code: counterKey },
    })
    const nextSeq = parseInt(current?.value ?? "0", 10) + 1
    await tx.setting.upsert({
      where: { userId_code: { userId, code: counterKey } },
      update: { value: nextSeq.toString() },
      create: {
        userId,
        code: counterKey,
        name: counterKey,
        value: nextSeq.toString(),
      },
    })
    const documentNumber = formatDocumentNumber(prefix, buddhistYear, nextSeq)

    return tx.document.create({
      data: {
        userId,
        documentType: targetType,
        documentNumber,
        status: "draft",
        sourceDocumentId,
        contactId: source.contactId,
        issuedAt: now,
        validUntil: null,
        paymentTerms: source.paymentTerms,
        dueDate: null,
        paymentMethod: null,
        paymentDate: null,
        paidAmount: null,
        subtotal: source.subtotal,
        discountAmount: source.discountAmount,
        vatRate: source.vatRate,
        vatAmount: source.vatAmount,
        total: source.total,
        items: source.items as unknown[],
        sellerData: (source.sellerData as object) ?? null,
        buyerData: (source.buyerData as object) ?? null,
        note: overrides?.note ?? source.note ?? null,
        ...(overrides?.dueDate ? { dueDate: overrides.dueDate } : {}),
        ...(overrides?.paymentMethod ? { paymentMethod: overrides.paymentMethod } : {}),
        ...(overrides?.paymentDate ? { paymentDate: overrides.paymentDate } : {}),
        ...(overrides?.paidAmount != null ? { paidAmount: overrides.paidAmount } : {}),
      },
    })
  })
}

/**
 * Get documents derived from a source document (chain children).
 */
export async function getDocumentsBySourceId(
  userId: string,
  sourceDocumentId: string,
  documentType?: string
) {
  return prisma.document.findMany({
    where: {
      userId,
      sourceDocumentId,
      ...(documentType ? { documentType } : {}),
    },
    orderBy: { createdAt: "desc" },
  })
}

/**
 * Sum paid amounts from non-voided receipts linked to an invoice.
 * Returns 0 when no receipts exist. Amounts are in satang.
 */
export async function sumReceiptAmountsForInvoice(
  userId: string,
  invoiceId: string
): Promise<number> {
  const result = await prisma.document.aggregate({
    where: {
      userId,
      sourceDocumentId: invoiceId,
      documentType: "RECEIPT",
      status: { not: "voided" },
    },
    _sum: { paidAmount: true },
  })
  return result._sum.paidAmount ?? 0
}

/**
 * List documents with chain relations (source and derived documents) included.
 * Supports extended filters: dateFrom/dateTo, contactId, documentType, status.
 */
export async function listDocumentsWithChain(
  userId: string,
  filters?: {
    documentType?: string
    status?: string
    contactId?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }
) {
  const issuedAtFilter =
    filters?.dateFrom || filters?.dateTo
      ? {
          issuedAt: {
            ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
            ...(filters.dateTo ? { lte: filters.dateTo } : {}),
          },
        }
      : {}

  return prisma.document.findMany({
    where: {
      userId,
      ...(filters?.documentType ? { documentType: filters.documentType } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.contactId ? { contactId: filters.contactId } : {}),
      ...issuedAtFilter,
    },
    include: {
      sourceDocument: {
        select: { id: true, documentNumber: true, documentType: true },
      },
      derivedDocuments: {
        select: { id: true, documentNumber: true, documentType: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit,
    skip: filters?.offset,
  })
}
