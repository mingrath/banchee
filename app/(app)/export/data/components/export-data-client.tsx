"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import { startTransition, useActionState, useCallback, useEffect, useState } from "react"
import { exportFlowAccountCSVAction, exportAccountantExcelAction } from "../actions"
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

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

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

export default function ExportDataClient() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Excel export state
  const [excelMonth, setExcelMonth] = useState(String(currentMonth))
  const [excelYear, setExcelYear] = useState(String(currentYear))
  const [excelState, excelAction, isExportingExcel] = useActionState(exportAccountantExcelAction, null)

  // CSV export state
  const todayStr = now.toISOString().split("T")[0]
  const firstOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
  const [dateFrom, setDateFrom] = useState(firstOfMonth)
  const [dateTo, setDateTo] = useState(todayStr)
  const [csvState, csvAction, isExportingCSV] = useActionState(exportFlowAccountCSVAction, null)

  const yearOptions = Array.from({ length: 3 }, (_, i) => currentYear - i)

  // Excel export handler
  const handleExportExcel = useCallback(() => {
    const formData = new FormData()
    formData.set("month", excelMonth)
    formData.set("year", excelYear)
    startTransition(() => {
      excelAction(formData)
    })
  }, [excelMonth, excelYear, excelAction])

  // CSV export handler
  const handleExportCSV = useCallback(() => {
    const formData = new FormData()
    formData.set("dateFrom", dateFrom)
    formData.set("dateTo", dateTo)
    startTransition(() => {
      csvAction(formData)
    })
  }, [dateFrom, dateTo, csvAction])

  // When Excel export completes, trigger download
  useEffect(() => {
    if (excelState?.success && excelState.data) {
      const buddhistYear = toBuddhistYear(parseInt(excelYear))
      const monthName = THAI_MONTHS[parseInt(excelMonth) - 1]
      const filename = `BanChee_${monthName}_${buddhistYear}.xlsx`
      const blob = base64ToBlob(
        excelState.data,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
      downloadBlob(blob, filename)
    }
  }, [excelState, excelMonth, excelYear])

  // When CSV export completes, trigger download
  useEffect(() => {
    if (csvState?.success && csvState.data) {
      const filename = `BanChee_FlowAccount_${dateFrom}_${dateTo}.csv`
      const blob = new Blob([csvState.data], { type: "text/csv;charset=utf-8" })
      downloadBlob(blob, filename)
    }
  }, [csvState, dateFrom, dateTo])

  return (
    <div className="space-y-6">
      {/* Card 1: For Accountant (Excel) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            สำหรับนักบัญชี
          </CardTitle>
          <CardDescription>
            ดาวน์โหลดไฟล์ Excel สำหรับส่งให้นักบัญชี ประกอบด้วยรายงานภาษีซื้อ ภาษีขาย ภ.พ.30 ภาษีหัก ณ ที่จ่าย และรายได้-รายจ่าย
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">เดือน</label>
              <Select value={excelMonth} onValueChange={setExcelMonth}>
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
              <Select value={excelYear} onValueChange={setExcelYear}>
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

            <Button onClick={handleExportExcel} disabled={isExportingExcel}>
              {isExportingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  กำลังสร้างไฟล์...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  ดาวน์โหลด Excel
                </>
              )}
            </Button>
          </div>

          {excelState?.error && (
            <p className="text-sm text-destructive">{excelState.error}</p>
          )}
        </CardContent>
      </Card>

      {/* Card 2: For FlowAccount (CSV) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            สำหรับ FlowAccount
          </CardTitle>
          <CardDescription>
            ส่งออก CSV สำหรับนำเข้า FlowAccount หรือโปรแกรมบัญชีอื่น
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ตั้งแต่วันที่</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ถึงวันที่</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <Button onClick={handleExportCSV} disabled={isExportingCSV}>
              {isExportingCSV ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  กำลังสร้างไฟล์...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  ดาวน์โหลด CSV
                </>
              )}
            </Button>
          </div>

          {csvState?.error && (
            <p className="text-sm text-destructive">{csvState.error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
