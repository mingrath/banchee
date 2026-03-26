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
import { QuotationPDF } from "../components/quotation-pdf"
import { updateQuotationStatusAction } from "../actions"
import { canTransition } from "@/services/document-workflow"
import type { QuotationData } from "@/services/document-workflow"
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

export function QuotationDetailActions({
  documentId,
  currentStatus,
  effectiveStatus,
  documentNumber,
  quotationData,
}: {
  documentId: string
  currentStatus: string
  effectiveStatus: string
  documentNumber: string
  quotationData: QuotationData
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)

  const [state, formAction, isPending] = useActionState(
    updateQuotationStatusAction,
    null
  )

  useEffect(() => {
    if (state?.success) {
      toast.success("\u0e2d\u0e31\u0e1b\u0e40\u0e14\u0e15\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08")
      setVoidDialogOpen(false)
    } else if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  const handleDownloadPDF = useCallback(async () => {
    setIsGenerating(true)
    try {
      const element = createElement(QuotationPDF, { data: quotationData })
      const blob = await pdf(element as any).toBlob()
      downloadBlob(blob, `${documentNumber}.pdf`)
      toast.success("PDF \u0e1e\u0e23\u0e49\u0e2d\u0e21\u0e14\u0e32\u0e27\u0e19\u0e4c\u0e42\u0e2b\u0e25\u0e14")
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      toast.error(
        "\u0e2a\u0e23\u0e49\u0e32\u0e07 PDF \u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08 \u2014 \u0e01\u0e23\u0e38\u0e13\u0e32\u0e25\u0e2d\u0e07\u0e43\u0e2b\u0e21\u0e48\u0e2d\u0e35\u0e01\u0e04\u0e23\u0e31\u0e49\u0e07"
      )
    } finally {
      setIsGenerating(false)
    }
  }, [quotationData, documentNumber])

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

  // Terminal statuses have no action buttons
  const isTerminal = ["accepted", "rejected", "expired", "converted", "voided"].includes(effectiveStatus)

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
            {"\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07 PDF..."}
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            {"\u0e14\u0e32\u0e27\u0e19\u0e4c\u0e42\u0e2b\u0e25\u0e14 PDF"}
          </>
        )}
      </Button>

      {/* Status action buttons (only for non-terminal statuses) */}
      {!isTerminal && (
        <>
          {/* Draft actions */}
          {currentStatus === "draft" && (
            <>
              {canTransition("QUOTATION", currentStatus, "sent") && (
                <Button
                  onClick={() => handleStatusChange("sent")}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {"\u0e2a\u0e48\u0e07\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"}
                </Button>
              )}
              {canTransition("QUOTATION", currentStatus, "voided") && (
                <Button
                  variant="destructive"
                  onClick={() => setVoidDialogOpen(true)}
                  disabled={isPending}
                >
                  {"\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01"}
                </Button>
              )}
            </>
          )}

          {/* Sent actions */}
          {currentStatus === "sent" && (
            <>
              {canTransition("QUOTATION", currentStatus, "accepted") && (
                <Button
                  onClick={() => handleStatusChange("accepted")}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {"\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34"}
                </Button>
              )}
              {canTransition("QUOTATION", currentStatus, "rejected") && (
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange("rejected")}
                  disabled={isPending}
                >
                  {"\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e1b\u0e0f\u0e34\u0e40\u0e2a\u0e18"}
                </Button>
              )}
              {canTransition("QUOTATION", currentStatus, "voided") && (
                <Button
                  variant="destructive"
                  onClick={() => setVoidDialogOpen(true)}
                  disabled={isPending}
                >
                  {"\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01"}
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
              {"\u0e22\u0e37\u0e19\u0e22\u0e31\u0e19\u0e01\u0e32\u0e23\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"}
            </DialogTitle>
            <DialogDescription>
              {"\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"} {documentNumber}{" "}
              {"\u0e08\u0e30\u0e16\u0e39\u0e01\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e41\u0e25\u0e30\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e41\u0e01\u0e49\u0e44\u0e02\u0e44\u0e14\u0e49\u0e2d\u0e35\u0e01"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setVoidDialogOpen(false)}
            >
              {"\u0e44\u0e21\u0e48\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {"\u0e22\u0e01\u0e40\u0e25\u0e34\u0e01\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
