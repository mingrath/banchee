import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentUser } from "@/lib/auth"
import { getDocumentById } from "@/models/documents"
import { formatThaiDate } from "@/services/thai-date"
import { DELIVERY_NOTE_STATUSES } from "@/services/document-workflow"
import type { QuotationLineItem } from "@/services/document-workflow"
import type { DeliveryNoteData } from "../components/delivery-note-pdf"
import { StatusBadge } from "../../quotation/components/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DeliveryNoteDetailActions } from "./detail-actions"

export const dynamic = "force-dynamic"

export default async function DeliveryNoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  const doc = await getDocumentById(user.id, id)

  if (!doc) {
    redirect("/apps/delivery-note")
  }

  const sellerData = (doc.sellerData as {
    name?: string
    taxId?: string
    branch?: string
    address?: string
    logo?: string
  }) ?? { name: "", taxId: "", branch: "", address: "" }

  const buyerData = (doc.buyerData as {
    name?: string
    taxId?: string
    branch?: string
    address?: string
  }) ?? { name: "", taxId: "", branch: "", address: "" }

  const rawItems = (doc.items as QuotationLineItem[]) ?? []

  // Load source document
  const sourceDoc = doc.sourceDocumentId
    ? await getDocumentById(user.id, doc.sourceDocumentId)
    : null

  // Build DeliveryNoteData for PDF download (simplified items without financial fields)
  const deliveryNoteData: DeliveryNoteData = {
    id: doc.id,
    documentNumber: doc.documentNumber,
    status: doc.status,
    issuedAt: doc.issuedAt?.toISOString() ?? "",
    seller: {
      name: sellerData.name ?? "",
      taxId: sellerData.taxId ?? "",
      branch: sellerData.branch ?? "",
      address: sellerData.address ?? "",
      logo: sellerData.logo,
    },
    buyer: {
      name: buyerData.name ?? "",
      taxId: buyerData.taxId ?? "",
      branch: buyerData.branch ?? "",
      address: buyerData.address ?? "",
    },
    items: rawItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
    })),
    note: doc.note ?? undefined,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{doc.documentNumber}</h2>
          <StatusBadge status={doc.status} />
        </div>

        <DeliveryNoteDetailActions
          documentId={doc.id}
          currentStatus={doc.status}
          documentNumber={doc.documentNumber}
          deliveryNoteData={deliveryNoteData}
        />
      </div>

      {/* Document Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            ข้อมูลเอกสาร
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Sender Info */}
            <div className="space-y-1 text-sm">
              <p className="font-medium text-muted-foreground">
                ผู้ส่งสินค้า
              </p>
              <p className="font-medium">{sellerData.name}</p>
              <p>{sellerData.address}</p>
              <p>Tax ID: {sellerData.taxId}</p>
              <p>
                {sellerData.branch === "00000"
                  ? "สำนักงานใหญ่"
                  : `สาขาที่ ${parseInt(sellerData.branch ?? "0", 10)}`}
              </p>
            </div>

            {/* Receiver Info */}
            <div className="space-y-1 text-sm">
              <p className="font-medium text-muted-foreground">
                ผู้รับสินค้า
              </p>
              <p className="font-medium">{buyerData.name}</p>
              <p>{buyerData.address}</p>
              <p>Tax ID: {buyerData.taxId}</p>
              <p>
                {buyerData.branch === "00000"
                  ? "สำนักงานใหญ่"
                  : `สาขาที่ ${parseInt(buyerData.branch ?? "0", 10)}`}
              </p>
            </div>
          </div>

          {/* Date */}
          <div className="grid grid-cols-1 gap-4 mt-4 pt-4 border-t text-sm">
            <div>
              <span className="text-muted-foreground">
                วันที่ออก:
              </span>{" "}
              {doc.issuedAt ? formatThaiDate(new Date(doc.issuedAt)) : "\u2014"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Card -- simplified: no financial columns per D-18 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            รายการสินค้า
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>รายละเอียด</TableHead>
                  <TableHead className="text-right">
                    จำนวน
                  </TableHead>
                  <TableHead>หน่วย</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell>{item.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* NO totals section -- delivery notes have no financial data per D-18 */}

          {/* Note */}
          {doc.note && (
            <div className="mt-4 pt-4 border-t text-sm">
              <span className="text-muted-foreground font-medium">
                หมายเหตุ:
              </span>{" "}
              {doc.note}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Documents Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            เอกสารที่เกี่ยวข้อง
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourceDoc ? (
            <div className="space-y-2">
              <Link
                href={`/apps/${sourceDoc.documentType === "QUOTATION" ? "quotation" : "invoice"}/${sourceDoc.id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {sourceDoc.documentType === "QUOTATION" ? "ใบเสนอราคา" : "ใบแจ้งหนี้"}:
                  </span>
                  <span className="font-medium text-sm text-primary">
                    {sourceDoc.documentNumber}
                  </span>
                </div>
                <StatusBadge status={sourceDoc.status} />
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              ยังไม่มีเอกสารที่เกี่ยวข้อง
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
