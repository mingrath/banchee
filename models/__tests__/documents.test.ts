import { describe, it, expect, vi, beforeEach } from "vitest"

// Use vi.hoisted so mock objects are available when vi.mock factories run (hoisted)
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    document: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    setting: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  return { mockPrisma }
})

vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}))

vi.mock("@/services/thai-date", () => ({
  toBuddhistYear: vi.fn(() => 2569),
}))

import {
  createDocument,
  getDocumentById,
  listDocuments,
  updateDocumentStatus,
  createDocumentFromSource,
  getDocumentsBySourceId,
  sumReceiptAmountsForInvoice,
  listDocumentsWithChain,
} from "@/models/documents"

const TEST_USER_ID = "user-uuid-123"

beforeEach(() => {
  vi.clearAllMocks()
  // Default $transaction implementation: pass the mock prisma to the callback
  mockPrisma.$transaction.mockImplementation(
    async (cb: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return cb(mockPrisma)
    }
  )
})

describe("createDocument", () => {
  it("calls prisma.$transaction, reads setting for counter, upserts setting, creates document with formatted number", async () => {
    // Setting not found (first document) -- counter starts at 0
    mockPrisma.setting.findFirst.mockResolvedValue(null)
    mockPrisma.setting.upsert.mockResolvedValue({ id: "s1", value: "1" })
    const createdDoc = {
      id: "doc-1",
      userId: TEST_USER_ID,
      documentType: "QUOTATION",
      documentNumber: "QT-2569-0001",
      status: "draft",
    }
    mockPrisma.document.create.mockResolvedValue(createdDoc)

    const result = await createDocument(TEST_USER_ID, {
      documentType: "QUOTATION",
      subtotal: 100000,
      discountAmount: 0,
      vatRate: 700,
      vatAmount: 7000,
      total: 107000,
      items: [{ description: "Item 1", quantity: 1, unitPrice: 100000, amount: 100000 }],
    })

    // $transaction must have been called
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()

    // setting.findFirst called with correct counter key
    expect(mockPrisma.setting.findFirst).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, code: "seq_qt_2569" },
    })

    // setting.upsert called with incremented value "1"
    expect(mockPrisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_code: { userId: TEST_USER_ID, code: "seq_qt_2569" } },
        update: { value: "1" },
        create: expect.objectContaining({
          userId: TEST_USER_ID,
          code: "seq_qt_2569",
          value: "1",
        }),
      })
    )

    // document.create called with formatted number QT-2569-0001
    expect(mockPrisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: TEST_USER_ID,
        documentType: "QUOTATION",
        documentNumber: "QT-2569-0001",
        status: "draft",
      }),
    })

    expect(result).toEqual(createdDoc)
  })

  it("increments existing counter correctly", async () => {
    mockPrisma.setting.findFirst.mockResolvedValue({ id: "s1", value: "5" })
    mockPrisma.setting.upsert.mockResolvedValue({ id: "s1", value: "6" })
    mockPrisma.document.create.mockResolvedValue({
      id: "doc-2",
      documentNumber: "QT-2569-0006",
    })

    await createDocument(TEST_USER_ID, {
      documentType: "QUOTATION",
      subtotal: 0,
      discountAmount: 0,
      vatRate: 0,
      vatAmount: 0,
      total: 0,
      items: [],
    })

    expect(mockPrisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { value: "6" },
      })
    )

    expect(mockPrisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        documentNumber: "QT-2569-0006",
      }),
    })
  })
})

describe("getDocumentById", () => {
  it("calls prisma.document.findFirst with userId and id, returns result", async () => {
    const doc = { id: "doc-1", userId: TEST_USER_ID, documentType: "QUOTATION" }
    mockPrisma.document.findFirst.mockResolvedValue(doc)

    const result = await getDocumentById(TEST_USER_ID, "doc-1")

    expect(mockPrisma.document.findFirst).toHaveBeenCalledWith({
      where: { id: "doc-1", userId: TEST_USER_ID },
    })
    expect(result).toEqual(doc)
  })

  it("returns null when not found", async () => {
    mockPrisma.document.findFirst.mockResolvedValue(null)

    const result = await getDocumentById(TEST_USER_ID, "nonexistent")

    expect(result).toBeNull()
  })
})

describe("listDocuments", () => {
  it("calls prisma.document.findMany with userId filter, orderBy createdAt desc", async () => {
    const docs = [{ id: "doc-1" }, { id: "doc-2" }]
    mockPrisma.document.findMany.mockResolvedValue(docs)

    const result = await listDocuments(TEST_USER_ID)

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID },
      orderBy: { createdAt: "desc" },
      take: undefined,
      skip: undefined,
    })
    expect(result).toEqual(docs)
  })

  it("includes documentType filter when provided", async () => {
    mockPrisma.document.findMany.mockResolvedValue([])

    await listDocuments(TEST_USER_ID, { documentType: "QUOTATION" })

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, documentType: "QUOTATION" },
      orderBy: { createdAt: "desc" },
      take: undefined,
      skip: undefined,
    })
  })

  it("includes status filter when provided", async () => {
    mockPrisma.document.findMany.mockResolvedValue([])

    await listDocuments(TEST_USER_ID, { status: "draft" })

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, status: "draft" },
      orderBy: { createdAt: "desc" },
      take: undefined,
      skip: undefined,
    })
  })

  it("applies limit and offset when provided", async () => {
    mockPrisma.document.findMany.mockResolvedValue([])

    await listDocuments(TEST_USER_ID, { limit: 10, offset: 20 })

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID },
      orderBy: { createdAt: "desc" },
      take: 10,
      skip: 20,
    })
  })
})

describe("updateDocumentStatus", () => {
  it("calls assertValidTransition then prisma.document.update for valid transition", async () => {
    const doc = {
      id: "doc-1",
      userId: TEST_USER_ID,
      documentType: "QUOTATION",
      status: "draft",
    }
    mockPrisma.document.findFirst.mockResolvedValue(doc)
    mockPrisma.document.update.mockResolvedValue({ ...doc, status: "sent" })

    const result = await updateDocumentStatus(TEST_USER_ID, "doc-1", "sent")

    expect(mockPrisma.document.findFirst).toHaveBeenCalledWith({
      where: { id: "doc-1", userId: TEST_USER_ID },
    })
    expect(mockPrisma.document.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { status: "sent" },
    })
    expect(result.status).toBe("sent")
  })

  it("throws Error for invalid transition (assertValidTransition throws)", async () => {
    const doc = {
      id: "doc-1",
      userId: TEST_USER_ID,
      documentType: "QUOTATION",
      status: "draft",
    }
    mockPrisma.document.findFirst.mockResolvedValue(doc)

    await expect(
      updateDocumentStatus(TEST_USER_ID, "doc-1", "accepted")
    ).rejects.toThrow("Invalid transition")
  })

  it("throws Error when document not found", async () => {
    mockPrisma.document.findFirst.mockResolvedValue(null)

    await expect(
      updateDocumentStatus(TEST_USER_ID, "nonexistent", "sent")
    ).rejects.toThrow("Document not found")
  })
})

// ─── createDocumentFromSource ───────────────────────────────────
describe("createDocumentFromSource", () => {
  const sourceDoc = {
    id: "source-doc-1",
    userId: TEST_USER_ID,
    documentType: "QUOTATION",
    documentNumber: "QT-2569-0001",
    status: "accepted",
    contactId: "contact-1",
    issuedAt: new Date("2026-01-01"),
    validUntil: new Date("2026-02-01"),
    paymentTerms: "30 days",
    subtotal: 100000,
    discountAmount: 5000,
    vatRate: 700,
    vatAmount: 6650,
    total: 101650,
    items: [{ description: "Widget", quantity: 2, unitPrice: 50000, amount: 100000 }],
    sellerData: { name: "Seller Co" },
    buyerData: { name: "Buyer Co" },
    note: "Test note",
  }

  it("loads source doc, creates new doc with sourceDocumentId and copied data, all in $transaction", async () => {
    mockPrisma.document.findFirst.mockResolvedValue(sourceDoc)
    mockPrisma.setting.findFirst.mockResolvedValue(null)
    mockPrisma.setting.upsert.mockResolvedValue({ id: "s1", value: "1" })
    const createdDoc = {
      id: "new-doc-1",
      documentType: "INVOICE",
      documentNumber: "INV-2569-0001",
      sourceDocumentId: "source-doc-1",
    }
    mockPrisma.document.create.mockResolvedValue(createdDoc)

    const result = await createDocumentFromSource(TEST_USER_ID, "source-doc-1", "INVOICE")

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    expect(mockPrisma.document.findFirst).toHaveBeenCalledWith({
      where: { id: "source-doc-1", userId: TEST_USER_ID },
    })
    expect(mockPrisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: TEST_USER_ID,
        documentType: "INVOICE",
        sourceDocumentId: "source-doc-1",
        contactId: "contact-1",
        subtotal: 100000,
        discountAmount: 5000,
        total: 101650,
      }),
    })
    expect(result).toEqual(createdDoc)
  })

  it("throws when source document not found", async () => {
    mockPrisma.document.findFirst.mockResolvedValue(null)

    await expect(
      createDocumentFromSource(TEST_USER_ID, "nonexistent", "INVOICE")
    ).rejects.toThrow("Document not found")
  })

  it("applies overrides when provided", async () => {
    mockPrisma.document.findFirst.mockResolvedValue(sourceDoc)
    mockPrisma.setting.findFirst.mockResolvedValue(null)
    mockPrisma.setting.upsert.mockResolvedValue({ id: "s1", value: "1" })
    mockPrisma.document.create.mockResolvedValue({ id: "new-doc-2" })

    await createDocumentFromSource(TEST_USER_ID, "source-doc-1", "INVOICE", {
      note: "Override note",
    })

    expect(mockPrisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        note: "Override note",
      }),
    })
  })
})

// ─── getDocumentsBySourceId ─────────────────────────────────────
describe("getDocumentsBySourceId", () => {
  it("calls findMany with sourceDocumentId filter", async () => {
    const docs = [{ id: "child-1" }]
    mockPrisma.document.findMany.mockResolvedValue(docs)

    const result = await getDocumentsBySourceId(TEST_USER_ID, "source-1")

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: {
        userId: TEST_USER_ID,
        sourceDocumentId: "source-1",
      },
      orderBy: { createdAt: "desc" },
    })
    expect(result).toEqual(docs)
  })

  it("includes documentType filter when provided", async () => {
    mockPrisma.document.findMany.mockResolvedValue([])

    await getDocumentsBySourceId(TEST_USER_ID, "source-1", "RECEIPT")

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
      where: {
        userId: TEST_USER_ID,
        sourceDocumentId: "source-1",
        documentType: "RECEIPT",
      },
      orderBy: { createdAt: "desc" },
    })
  })
})

// ─── sumReceiptAmountsForInvoice ────────────────────────────────
describe("sumReceiptAmountsForInvoice", () => {
  it("returns sum of paidAmount from non-voided receipts", async () => {
    mockPrisma.document.aggregate.mockResolvedValue({
      _sum: { paidAmount: 75000 },
    })

    const result = await sumReceiptAmountsForInvoice(TEST_USER_ID, "invoice-1")

    expect(mockPrisma.document.aggregate).toHaveBeenCalledWith({
      where: {
        userId: TEST_USER_ID,
        sourceDocumentId: "invoice-1",
        documentType: "RECEIPT",
        status: { not: "voided" },
      },
      _sum: { paidAmount: true },
    })
    expect(result).toBe(75000)
  })

  it("returns 0 when no receipts exist", async () => {
    mockPrisma.document.aggregate.mockResolvedValue({
      _sum: { paidAmount: null },
    })

    const result = await sumReceiptAmountsForInvoice(TEST_USER_ID, "invoice-1")

    expect(result).toBe(0)
  })
})

// ─── listDocumentsWithChain ─────────────────────────────────────
describe("listDocumentsWithChain", () => {
  it("calls findMany with include for sourceDocument and derivedDocuments", async () => {
    const docs = [{ id: "doc-1", sourceDocument: null, derivedDocuments: [] }]
    mockPrisma.document.findMany.mockResolvedValue(docs)

    const result = await listDocumentsWithChain(TEST_USER_ID)

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: TEST_USER_ID }),
        include: expect.objectContaining({
          sourceDocument: expect.any(Object),
          derivedDocuments: expect.any(Object),
        }),
        orderBy: { createdAt: "desc" },
      })
    )
    expect(result).toEqual(docs)
  })

  it("applies dateFrom/dateTo filters on issuedAt", async () => {
    mockPrisma.document.findMany.mockResolvedValue([])

    const dateFrom = new Date("2026-01-01")
    const dateTo = new Date("2026-03-31")
    await listDocumentsWithChain(TEST_USER_ID, { dateFrom, dateTo })

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          issuedAt: { gte: dateFrom, lte: dateTo },
        }),
      })
    )
  })

  it("applies contactId filter", async () => {
    mockPrisma.document.findMany.mockResolvedValue([])

    await listDocumentsWithChain(TEST_USER_ID, { contactId: "contact-1" })

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contactId: "contact-1",
        }),
      })
    )
  })

  it("applies documentType and status filters", async () => {
    mockPrisma.document.findMany.mockResolvedValue([])

    await listDocumentsWithChain(TEST_USER_ID, { documentType: "INVOICE", status: "draft" })

    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          documentType: "INVOICE",
          status: "draft",
        }),
      })
    )
  })
})
