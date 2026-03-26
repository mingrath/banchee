import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getDocumentById } from "@/models/documents"
import { getContactById } from "@/models/contacts"
import { getBusinessProfile } from "@/models/business-profile"
import { formatCurrency } from "@/lib/utils"
import { formatThaiDate } from "@/services/thai-date"
import { canTransition } from "@/services/document-workflow"
import type { QuotationData, QuotationLineItem } from "@/services/document-workflow"
import { StatusBadge } from "../components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { QuotationDetailActions } from "./detail-actions"

export const dynamic = "force-dynamic"

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  const doc = await getDocumentById(user.id, id)

  if (!doc) {
    redirect("/apps/quotation")
  }

  const [contact, profile] = await Promise.all([
    doc.contactId ? getContactById(user.id, doc.contactId) : null,
    getBusinessProfile(user.id),
  ])

  const sellerData = (doc.sellerData as {
    name?: string
    taxId?: string
    branch?: string
    address?: string
  }) ?? { name: "", taxId: "", branch: "", address: "" }

  const buyerData = (doc.buyerData as {
    name?: string
    taxId?: string
    branch?: string
    address?: string
  }) ?? { name: "", taxId: "", branch: "", address: "" }

  const items = (doc.items as QuotationLineItem[]) ?? []

  // Determine effective status (lazy expiration)
  const effectiveStatus =
    doc.status === "sent" &&
    doc.validUntil &&
    new Date(doc.validUntil) < new Date()
      ? "expired"
      : doc.status

  // Build QuotationData for PDF download
  const quotationData: QuotationData = {
    id: doc.id,
    documentNumber: doc.documentNumber,
    status: effectiveStatus,
    issuedAt: doc.issuedAt?.toISOString() ?? "",
    validUntil: doc.validUntil?.toISOString() ?? "",
    paymentTerms: doc.paymentTerms ?? "",
    seller: {
      name: sellerData.name ?? "",
      taxId: sellerData.taxId ?? "",
      branch: sellerData.branch ?? "",
      address: sellerData.address ?? "",
    },
    buyer: {
      name: buyerData.name ?? "",
      taxId: buyerData.taxId ?? "",
      branch: buyerData.branch ?? "",
      address: buyerData.address ?? "",
    },
    items,
    subtotal: doc.subtotal,
    discountAmount: doc.discountAmount,
    includeVat: doc.vatRate > 0,
    vatAmount: doc.vatAmount,
    total: doc.total,
    note: doc.note ?? undefined,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{doc.documentNumber}</h2>
          <StatusBadge status={effectiveStatus} />
        </div>

        <QuotationDetailActions
          documentId={doc.id}
          currentStatus={doc.status}
          effectiveStatus={effectiveStatus}
          documentNumber={doc.documentNumber}
          quotationData={quotationData}
        />
      </div>

      {/* Document Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {"\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Seller Info */}
            <div className="space-y-1 text-sm">
              <p className="font-medium text-muted-foreground">
                {"\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"}
              </p>
              <p className="font-medium">{sellerData.name}</p>
              <p>{sellerData.address}</p>
              <p>Tax ID: {sellerData.taxId}</p>
              <p>
                {sellerData.branch === "00000"
                  ? "\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e0d\u0e48"
                  : `\u0e2a\u0e32\u0e02\u0e32\u0e17\u0e35\u0e48 ${parseInt(sellerData.branch ?? "0", 10)}`}
              </p>
            </div>

            {/* Buyer Info */}
            <div className="space-y-1 text-sm">
              <p className="font-medium text-muted-foreground">
                {"\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e23\u0e32\u0e04\u0e32"}
              </p>
              <p className="font-medium">{buyerData.name}</p>
              <p>{buyerData.address}</p>
              <p>Tax ID: {buyerData.taxId}</p>
              <p>
                {buyerData.branch === "00000"
                  ? "\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e0d\u0e48"
                  : `\u0e2a\u0e32\u0e02\u0e32\u0e17\u0e35\u0e48 ${parseInt(buyerData.branch ?? "0", 10)}`}
              </p>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t text-sm">
            <div>
              <span className="text-muted-foreground">
                {"\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e2d\u0e2d\u0e01"}:
              </span>{" "}
              {doc.issuedAt ? formatThaiDate(new Date(doc.issuedAt)) : "\u2014"}
            </div>
            <div>
              <span className="text-muted-foreground">
                {"\u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38"}:
              </span>{" "}
              {doc.validUntil
                ? formatThaiDate(new Date(doc.validUntil))
                : "\u2014"}
            </div>
            {doc.paymentTerms && (
              <div>
                <span className="text-muted-foreground">
                  {"\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19"}:
                </span>{" "}
                {doc.paymentTerms}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Line Items Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {"\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32"} / {"\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{"\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14"}</TableHead>
                  <TableHead className="text-right">
                    {"\u0e08\u0e33\u0e19\u0e27\u0e19"}
                  </TableHead>
                  <TableHead>{"\u0e2b\u0e19\u0e48\u0e27\u0e22"}</TableHead>
                  <TableHead className="text-right">
                    {"\u0e23\u0e32\u0e04\u0e32/\u0e2b\u0e19\u0e48\u0e27\u0e22"}
                  </TableHead>
                  <TableHead className="text-right">
                    {"\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14"}
                  </TableHead>
                  <TableHead className="text-right">
                    {"\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.unitPrice, "THB")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.discount, "THB")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.amount, "THB")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals */}
          <div className="border-t pt-4 mt-4 space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {"\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32/\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23"}
              </span>
              <span className="tabular-nums">
                {formatCurrency(doc.subtotal, "THB")}
              </span>
            </div>
            {doc.discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {"\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14\u0e23\u0e27\u0e21"}
                </span>
                <span className="tabular-nums">
                  {formatCurrency(doc.discountAmount, "THB")}
                </span>
              </div>
            )}
            {doc.vatRate > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {"\u0e20\u0e32\u0e29\u0e35\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e40\u0e1e\u0e34\u0e48\u0e21"} 7%
                </span>
                <span className="tabular-nums">
                  {formatCurrency(doc.vatAmount, "THB")}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t pt-2">
              <span>{"\u0e23\u0e27\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2a\u0e34\u0e49\u0e19"}</span>
              <span className="tabular-nums">
                {formatCurrency(doc.total, "THB")}
              </span>
            </div>
          </div>

          {/* Note */}
          {doc.note && (
            <div className="mt-4 pt-4 border-t text-sm">
              <span className="text-muted-foreground font-medium">
                {"\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38"}:
              </span>{" "}
              {doc.note}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Chain Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {"\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e17\u0e35\u0e48\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e02\u0e49\u0e2d\u0e07"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {"\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e17\u0e35\u0e48\u0e40\u0e01\u0e35\u0e48\u0e22\u0e27\u0e02\u0e49\u0e2d\u0e07"}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
