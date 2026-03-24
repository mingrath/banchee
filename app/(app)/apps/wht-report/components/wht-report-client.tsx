"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"
import { Download, FileText, Loader2 } from "lucide-react"
import { startTransition, useActionState, useCallback, useEffect, useState } from "react"
import { generateWHTReportAction, exportPND3TxtAction, exportPND53TxtAction, type WHTReportData } from "../actions"
import { ReportPreview } from "./report-preview"
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

export function WHTReportClient({
  defaultMonth,
  defaultYear,
  businessProfile,
}: {
  defaultMonth: number
  defaultYear: number
  businessProfile: BusinessProfile
}) {
  const [month, setMonth] = useState(String(defaultMonth))
  const [year, setYear] = useState(String(defaultYear))
  const [previewOpen, setPreviewOpen] = useState(false)
  const [reportData, setReportData] = useState<WHTReportData | null>(null)

  const [generateState, generateAction, isGenerating] = useActionState(generateWHTReportAction, null)
  const [exportPND3State, exportPND3Action, isExportingPND3] = useActionState(exportPND3TxtAction, null)
  const [exportPND53State, exportPND53Action, isExportingPND53] = useActionState(exportPND53TxtAction, null)

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

  const handleExportPND3 = useCallback(() => {
    const formData = new FormData()
    formData.set("month", month)
    formData.set("year", year)
    startTransition(() => {
      exportPND3Action(formData)
    })
  }, [month, year, exportPND3Action])

  const handleExportPND53 = useCallback(() => {
    const formData = new FormData()
    formData.set("month", month)
    formData.set("year", year)
    startTransition(() => {
      exportPND53Action(formData)
    })
  }, [month, year, exportPND53Action])

  // When generation completes, open preview
  useEffect(() => {
    if (generateState?.success && generateState.data) {
      setReportData(generateState.data)
      setPreviewOpen(true)
    }
  }, [generateState])

  // When PND3 export completes, trigger download
  useEffect(() => {
    if (exportPND3State?.success && exportPND3State.data) {
      const buddhistYear = toBuddhistYear(parseInt(year))
      const filename = `PND3_${month}_${buddhistYear}.txt`
      const blob = new Blob([exportPND3State.data], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [exportPND3State, month, year])

  // When PND53 export completes, trigger download
  useEffect(() => {
    if (exportPND53State?.success && exportPND53State.data) {
      const buddhistYear = toBuddhistYear(parseInt(year))
      const filename = `PND53_${month}_${buddhistYear}.txt`
      const blob = new Blob([exportPND53State.data], { type: "text/plain;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [exportPND53State, month, year])

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
              สร้างรายงาน
            </>
          )}
        </Button>

        <Button variant="outline" onClick={handleExportPND3} disabled={isExportingPND3}>
          {isExportingPND3 ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              กำลังส่งออก...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              ส่งออก ภ.ง.ด.3 สำหรับ e-Filing
            </>
          )}
        </Button>

        <Button variant="outline" onClick={handleExportPND53} disabled={isExportingPND53}>
          {isExportingPND53 ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              กำลังส่งออก...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              ส่งออก ภ.ง.ด.53 สำหรับ e-Filing
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground -mt-4">
        ดาวน์โหลดไฟล์ .txt สำหรับนำเข้า RD Prep หรืออัปโหลดที่ efiling.rd.go.th
      </p>

      {/* Error display */}
      {(generateState?.error || exportPND3State?.error || exportPND53State?.error) && (
        <p className="text-sm text-destructive">
          {generateState?.error || exportPND3State?.error || exportPND53State?.error}
        </p>
      )}

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            สรุปภาษีหัก ณ ที่จ่าย เดือน {THAI_MONTHS[parseInt(month) - 1]} {toBuddhistYear(parseInt(year))}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            เลือกเดือนและปี แล้วกด "สร้างรายงาน" เพื่อดูรายละเอียดและดาวน์โหลดเอกสาร
          </p>
          {reportData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ภ.ง.ด.3 (บุคคลธรรมดา)</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(reportData.pnd3Summary.totalTaxWithheld, "THB")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reportData.pnd3Summary.transactionCount} รายการ
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ภ.ง.ด.53 (นิติบุคคล)</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(reportData.pnd53Summary.totalTaxWithheld, "THB")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reportData.pnd53Summary.transactionCount} รายการ
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">รวมภาษีหัก</p>
                <p className="text-xl font-bold text-amber-600">
                  {formatCurrency(
                    reportData.pnd3Summary.totalTaxWithheld + reportData.pnd53Summary.totalTaxWithheld,
                    "THB"
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {reportData.pnd3Summary.transactionCount + reportData.pnd53Summary.transactionCount} รายการ
                </p>
              </div>
            </div>
          )}
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
