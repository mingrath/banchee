"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency } from "@/lib/utils"
import { formatThaiDate } from "@/services/thai-date"
import { Download, Loader2, Plus } from "lucide-react"
import { useState, useCallback, createElement } from "react"
import { pdf } from "@react-pdf/renderer"
import { TaxInvoicePDF } from "./tax-invoice-pdf"
import type { TaxInvoiceData } from "../actions"
import { toast } from "sonner"

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function InvoicePreview({
  open,
  onOpenChange,
  invoiceData,
  onCreateNew,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceData: TaxInvoiceData
  onCreateNew: () => void
}) {
  const [isGenerating, setIsGenerating] = useState(false)

  const { documentNumber, buyer, issuedAt, subtotal, vatAmount, total, items } = invoiceData
  const issuedDate = new Date(issuedAt)

  const handleDownload = useCallback(async () => {
    setIsGenerating(true)
    try {
      const element = createElement(TaxInvoicePDF, { invoiceData })
      const blob = await pdf(element as any).toBlob()
      downloadBlob(blob, `${documentNumber}.pdf`)
      toast.success("PDF พร้อมดาวน์โหลด")
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      toast.error("สร้าง PDF ไม่สำเร็จ -- กรุณาลองใหม่อีกครั้ง")
    } finally {
      setIsGenerating(false)
    }
  }, [invoiceData, documentNumber])

  const summaryRows = [
    { label: "ผู้ซื้อ", value: buyer.name, isAmount: false },
    { label: "Tax ID ผู้ซื้อ", value: buyer.taxId, isAmount: false },
    {
      label: "วันที่ออก",
      value: formatThaiDate(issuedDate),
      isAmount: false,
    },
    { label: "จำนวนรายการ", value: `${items.length} รายการ`, isAmount: false },
    { label: "มูลค่าสินค้า/บริการ", value: formatCurrency(subtotal, "THB"), isAmount: true },
    { label: "VAT 7%", value: formatCurrency(vatAmount, "THB"), isAmount: true },
    { label: "รวมทั้งสิ้น", value: formatCurrency(total, "THB"), isAmount: true },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>สร้างใบกำกับภาษีสำเร็จ</DialogTitle>
          <DialogDescription>
            เลขที่เอกสาร: {documentNumber}
          </DialogDescription>
        </DialogHeader>

        {/* Summary Table */}
        <div className="space-y-1">
          {summaryRows.map((row) => (
            <div
              key={row.label}
              className="flex justify-between items-center py-1.5 px-2 rounded hover:bg-muted/50"
            >
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span
                className={`text-sm ${row.isAmount ? "tabular-nums font-medium" : ""}`}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4">
          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                กำลังสร้าง PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                ดาวน์โหลด PDF
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onCreateNew}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            สร้างใบใหม่
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
