"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { Download, FileText, Loader2 } from "lucide-react"
import { startTransition, useActionState, useCallback, useEffect, useState } from "react"
import { generateVATReportAction, exportPP30TxtAction, type VATReportData } from "../actions"
import { ReportPreview } from "./report-preview"
import type { VATSummary } from "@/models/stats"
import type { BusinessProfile } from "@/models/business-profile"
import { toBuddhistYear } from "@/services/thai-date"

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
]

export function VATReportClient({
  defaultMonth,
  defaultYear,
  initialSummary,
  businessProfile,
}: {
  defaultMonth: number
  defaultYear: number
  initialSummary: VATSummary
  businessProfile: BusinessProfile
}) {
  const [month, setMonth] = useState(String(defaultMonth))
  const [year, setYear] = useState(String(defaultYear))
  const [previewOpen, setPreviewOpen] = useState(false)
  const [reportData, setReportData] = useState<VATReportData | null>(null)

  const [generateState, generateAction, isGenerating] = useActionState(generateVATReportAction, null)
  const [exportState, exportAction, isExporting] = useActionState(exportPP30TxtAction, null)

  // Build year options (current year and 2 years back)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i)

  const handleGenerate = useCallback(() => {
    const formData = new FormData()
    formData.set("month", month)
    formData.set("year", year)
    startTransition(() => {
      generateAction(formData)
    })
  }, [month, year, generateAction])

  const handleExportPP30 = useCallback(() => {
    const formData = new FormData()
    formData.set("month", month)
    formData.set("year", year)
    startTransition(() => {
      exportAction(formData)
    })
  }, [month, year, exportAction])

  // When generation completes, open preview
  useEffect(() => {
    if (generateState?.success && generateState.data) {
      setReportData(generateState.data)
      setPreviewOpen(true)
    }
  }, [generateState])

  // When export completes, trigger download
  useEffect(() => {
    if (exportState?.success && exportState.data) {
      const buddhistYear = toBuddhistYear(parseInt(year))
      const filename = `PP30_${month}_${buddhistYear}.txt`
      const blob = new Blob([exportState.data], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [exportState, month, year])

  const netVAT = initialSummary.netVAT
  const isPayable = netVAT > 0

  return (
    <div className="space-y-6">
      {/* Month/Year Selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">เดือนภาษี</label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THAI_MONTHS.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">ปี (พ.ศ.)</label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {toBuddhistYear(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              กำลังสร้างรายงาน...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              ออกรายงาน
            </>
          )}
        </Button>

        <Button variant="outline" onClick={handleExportPP30} disabled={isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              กำลังส่งออก...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              ส่งออกสำหรับ e-Filing
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground -mt-4">
        ดาวน์โหลดไฟล์ .txt สำหรับนำเข้า RD Prep หรืออัปโหลดที่ efiling.rd.go.th
      </p>

      {/* Error display */}
      {(generateState?.error || exportState?.error) && (
        <p className="text-sm text-destructive">{generateState?.error || exportState?.error}</p>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            สรุป VAT เดือน {THAI_MONTHS[parseInt(month) - 1]} {toBuddhistYear(parseInt(year))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ภาษีขาย</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(initialSummary.outputVAT, "THB")}
              </p>
              <p className="text-xs text-muted-foreground">
                {initialSummary.outputCount} รายการ
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">ภาษีซื้อ</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(initialSummary.inputVAT, "THB")}
              </p>
              <p className="text-xs text-muted-foreground">
                {initialSummary.inputCount} รายการ
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {isPayable ? "ต้องชำระ" : "เครดิตภาษี"}
              </p>
              <p className={`text-xl font-bold ${isPayable ? "text-amber-600" : "text-green-600"}`}>
                {formatCurrency(Math.abs(netVAT), "THB")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {reportData && (
        <ReportPreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          reportData={reportData}
        />
      )}
    </div>
  )
}
