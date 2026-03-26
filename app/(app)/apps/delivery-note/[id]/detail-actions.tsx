"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Loader2 } from "lucide-react"
import { createElement, startTransition, useActionState, useCallback, useEffect, useState } from "react"
import { pdf } from "@react-pdf/renderer"
import { DeliveryNotePDF } from "../components/delivery-note-pdf"
import type { DeliveryNoteData } from "../components/delivery-note-pdf"
import { updateDeliveryNoteStatusAction } from "../actions"
import { canTransition } from "@/services/document-workflow"
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

export function DeliveryNoteDetailActions({
  documentId,
  currentStatus,
  documentNumber,
  deliveryNoteData,
}: {
  documentId: string
  currentStatus: string
  documentNumber: string
  deliveryNoteData: DeliveryNoteData
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)

  const [state, formAction, isPending] = useActionState(
    updateDeliveryNoteStatusAction,
    null
  )

  useEffect(() => {
    if (state?.success) {
      toast.success("อัปเดตสถานะสำเร็จ")
      setVoidDialogOpen(false)
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  const handleDownloadPDF = useCallback(async () => {
    setIsGenerating(true)
    try {
      const element = createElement(DeliveryNotePDF, { data: deliveryNoteData })
      const blob = await pdf(element as any).toBlob()
      downloadBlob(blob, `${documentNumber}.pdf`)
      toast.success("PDF พร้อมดาวน์โหลด")
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      toast.error(
        "สร้าง PDF ไม่สำเร็จ \u2014 กรุณาลองใหม่อีกครั้ง"
      )
    } finally {
      setIsGenerating(false)
    }
  }, [deliveryNoteData, documentNumber])

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      const fd = new FormData()
      fd.set("documentId", documentId)
      fd.set("newStatus", newStatus)
      startTransition(() => {
        formAction(fd)
      })
    },
    [documentId, formAction]
  )

  const handleVoid = useCallback(() => {
    const fd = new FormData()
    fd.set("documentId", documentId)
    fd.set("newStatus", "voided")
    startTransition(() => {
      formAction(fd)
    })
  }, [documentId, formAction])

  // Terminal statuses have no status action buttons
  const isTerminal = ["delivered", "voided"].includes(currentStatus)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* PDF Download (always visible) */}
      <Button
        variant="outline"
        onClick={handleDownloadPDF}
        disabled={isGenerating}
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

      {/* Status action buttons (only for non-terminal statuses) */}
      {!isTerminal && (
        <>
          {/* Draft actions */}
          {currentStatus === "draft" && (
            <>
              {canTransition("DELIVERY_NOTE", currentStatus, "delivered") && (
                <Button
                  onClick={() => handleStatusChange("delivered")}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  ยืนยันส่งสินค้า
                </Button>
              )}
              {canTransition("DELIVERY_NOTE", currentStatus, "voided") && (
                <Button
                  variant="destructive"
                  onClick={() => setVoidDialogOpen(true)}
                  disabled={isPending}
                >
                  ยกเลิก
                </Button>
              )}
            </>
          )}
        </>
      )}

      {/* Void Confirmation Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              ยืนยันการยกเลิกใบส่งของ
            </DialogTitle>
            <DialogDescription>
              ใบส่งของ {documentNumber}{" "}
              จะถูกยกเลิกและไม่สามารถแก้ไขได้อีก
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setVoidDialogOpen(false)}
            >
              ไม่ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              ยกเลิกใบส่งของ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
