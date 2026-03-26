"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, FileSpreadsheet, Loader2, Info } from "lucide-react"
import { toast } from "sonner"
import { BANK_PRESETS } from "@/services/bank-statement-parser"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

type StatementUploadProps = {
  onFileLoaded: (file: File, rows: string[][], encoding: string) => void
  bankPreset: string
  onBankPresetChange: (preset: string) => void
}

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"]
const ACCEPTED_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]

function isValidFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

/**
 * Simple client-side CSV preview parser.
 * Splits lines and cells for column mapper display only.
 * The robust @fast-csv/parse parsing happens server-side in the import action.
 */
function parseCSVPreview(text: string, maxRows: number = 10): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const rows: string[][] = []
  for (let i = 0; i < Math.min(lines.length, maxRows); i++) {
    // Simple CSV split -- handles quoted fields
    const cells: string[] = []
    let current = ""
    let inQuotes = false
    for (const ch of lines[i]) {
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        cells.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    cells.push(current.trim())
    rows.push(cells)
  }
  return rows
}

/**
 * Detect if buffer contains TIS-620 encoded Thai text.
 * Mirrors the server-side detectEncoding logic for preview display.
 */
function detectEncodingFromArray(bytes: Uint8Array): "utf-8" | "windows-874" {
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  const hasThaiUnicode = /[\u0E00-\u0E7F]/.test(utf8Text)
  if (hasThaiUnicode) return "utf-8"

  const hasTIS620Bytes = bytes.some((b) => b >= 0xA1 && b <= 0xFB)
  if (hasTIS620Bytes) return "windows-874"

  return "utf-8"
}

export default function StatementUpload({
  onFileLoaded,
  bankPreset,
  onBankPresetChange,
}: StatementUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [detectedEncoding, setDetectedEncoding] = useState<string>("utf-8")
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (selectedFile: File) => {
      if (!isValidFile(selectedFile)) {
        toast.error("รองรับเฉพาะไฟล์ CSV และ Excel (.xlsx)")
        return
      }

      setIsLoading(true)
      setFile(selectedFile)

      try {
        const arrayBuffer = await selectedFile.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        const fileName = selectedFile.name.toLowerCase()

        let rows: string[][] = []
        let encoding: string = "utf-8"

        if (fileName.endsWith(".csv")) {
          encoding = detectEncodingFromArray(bytes)
          setDetectedEncoding(encoding)

          // Decode using detected encoding for preview
          const decoder = new TextDecoder(encoding, { fatal: false })
          const text = decoder.decode(bytes)
          rows = parseCSVPreview(text, 10)
        } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          // For Excel files, read using a simple approach for preview
          // The full parsing happens server-side via ExcelJS
          // Client-side: use the file as-is, parse preview from text representation
          encoding = "utf-8"
          setDetectedEncoding(encoding)

          // Excel preview is limited on client side
          // We pass empty rows and let the server handle full parsing
          // But we still need some preview for the column mapper
          // Use a simpler approach: try to read as text for basic preview
          try {
            // Try importing xlsx for client-side preview
            const ExcelJS = (await import("exceljs")).default
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(arrayBuffer)
            const worksheet = workbook.worksheets[0]
            if (worksheet) {
              worksheet.eachRow((row, rowNumber) => {
                if (rowNumber <= 10) {
                  const values = row.values as (
                    | string
                    | number
                    | Date
                    | null
                  )[]
                  const cells = values.slice(1).map((v) => {
                    if (v instanceof Date) return v.toISOString()
                    if (v === null || v === undefined) return ""
                    return String(v)
                  })
                  rows.push(cells)
                }
              })
            }
          } catch {
            // If ExcelJS fails on client, pass empty rows
            // Server-side will handle the actual parsing
            rows = []
          }
        }

        onFileLoaded(selectedFile, rows, encoding)
      } catch (error) {
        console.error("Failed to parse file preview:", error)
        toast.error("ไม่สามารถอ่านไฟล์ได้")
      } finally {
        setIsLoading(false)
      }
    },
    [onFileLoaded]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        processFile(droppedFile)
      }
    },
    [processFile]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        processFile(selectedFile)
      }
    },
    [processFile]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        fileInputRef.current?.click()
      }
    },
    []
  )

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="อัปโหลดไฟล์ CSV หรือ Excel"
        className={`relative border-2 border-dashed rounded-lg p-12 transition-colors cursor-pointer ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          {isLoading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : file ? (
            <FileSpreadsheet className="h-8 w-8 text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <div>
            {isLoading ? (
              <p className="text-lg font-medium">
                กำลังอ่านไฟล์...
              </p>
            ) : file ? (
              <>
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  คลิกหรือลากไฟล์ใหม่เพื่อเปลี่ยน
                </p>
              </>
            ) : isDragOver ? (
              <p className="text-lg font-medium">
                วางไฟล์ที่นี่
              </p>
            ) : (
              <>
                <p className="text-lg font-medium">
                  ลากไฟล์มาวางที่นี่ หรือ คลิกเพื่อเลือกไฟล์
                </p>
                <p className="text-sm text-muted-foreground">
                  รองรับไฟล์ CSV และ Excel (.xlsx)
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Encoding notice for TIS-620 */}
      {file && detectedEncoding === "windows-874" && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            ตรวจพบการเข้ารหัส TIS-620 -- แปลงเป็น UTF-8 อัตโนมัติ
          </AlertDescription>
        </Alert>
      )}

      {/* Bank preset selector -- visible after file loaded */}
      {file && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            เลือกธนาคาร
          </label>
          <Select value={bankPreset} onValueChange={onBankPresetChange}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกธนาคาร" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BANK_PRESETS).map(([key, preset]) => (
                <SelectItem key={key} value={key}>
                  {preset.label} ({preset.labelTh})
                </SelectItem>
              ))}
              <SelectItem value="other">อื่นๆ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )
}
