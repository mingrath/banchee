"use client"

import { useCallback, useMemo } from "react"
import type { ColumnMapping } from "@/services/bank-statement-parser"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type ColumnMapperProps = {
  previewRows: string[][]
  mapping: ColumnMapping
  onMappingChange: (mapping: ColumnMapping) => void
}

// Column field options with Thai labels
const COLUMN_OPTIONS: {
  value: string
  label: string
  mappingKey: keyof ColumnMapping | null
}[] = [
  { value: "skip", label: "ข้าม (Skip)", mappingKey: null },
  { value: "date", label: "วันที่ (Date)", mappingKey: "date" },
  { value: "description", label: "รายละเอียด (Description)", mappingKey: "description" },
  { value: "deposit", label: "ฝาก (Deposit)", mappingKey: "deposit" },
  { value: "withdrawal", label: "ถอน (Withdrawal)", mappingKey: "withdrawal" },
  { value: "balance", label: "ยอดคงเหลือ (Balance)", mappingKey: "balance" },
  { value: "reference", label: "เลขอ้างอิง (Reference)", mappingKey: "reference" },
]

/**
 * Get the currently selected option value for a column index.
 */
function getSelectedOption(mapping: ColumnMapping, colIndex: number): string {
  for (const opt of COLUMN_OPTIONS) {
    if (opt.mappingKey === null) continue
    const mappingValue = mapping[opt.mappingKey]
    if (mappingValue === colIndex) return opt.value
  }
  return "skip"
}

/**
 * Check if required columns are mapped.
 * Required: Date AND Description AND (Deposit OR Withdrawal)
 */
export function isValidMapping(mapping: ColumnMapping): boolean {
  const hasDate = mapping.date >= 0
  const hasDescription = mapping.description >= 0
  const hasDepositOrWithdrawal =
    (mapping.deposit !== null && mapping.deposit >= 0) ||
    (mapping.withdrawal !== null && mapping.withdrawal >= 0)
  return hasDate && hasDescription && hasDepositOrWithdrawal
}

export default function ColumnMapper({
  previewRows,
  mapping,
  onMappingChange,
}: ColumnMapperProps) {
  // Determine number of columns from the widest row
  const columnCount = useMemo(() => {
    return previewRows.reduce((max, row) => Math.max(max, row.length), 0)
  }, [previewRows])

  // First row is typically the header, data rows for preview are rows 1-3
  const headerRow = previewRows[0] ?? []
  const dataRows = previewRows.slice(1, 4) // Show first 3 data rows

  const handleColumnChange = useCallback(
    (colIndex: number, value: string) => {
      // Build new mapping using immutable pattern
      const newMapping: ColumnMapping = { ...mapping }

      // Find the option that was selected
      const selectedOption = COLUMN_OPTIONS.find((opt) => opt.value === value)

      // First, clear this column from any existing assignment
      for (const opt of COLUMN_OPTIONS) {
        if (opt.mappingKey === null) continue
        if (mapping[opt.mappingKey] === colIndex) {
          if (opt.mappingKey === "date" || opt.mappingKey === "description") {
            // Required fields: set to -1 (invalid) when cleared
            newMapping[opt.mappingKey] = -1
          } else {
            // Optional fields: set to null when cleared
            newMapping[opt.mappingKey] = null
          }
        }
      }

      // Then, set the new assignment
      if (selectedOption && selectedOption.mappingKey !== null) {
        const key = selectedOption.mappingKey

        // Exclusive selection: clear this field from any other column
        // (already handled above for the current column)
        // For other columns that had this field, set them to skip
        for (const opt of COLUMN_OPTIONS) {
          if (opt.mappingKey === null) continue
          if (opt.mappingKey === key && newMapping[opt.mappingKey] !== colIndex) {
            // Clear previous assignment of this field
            if (key === "date" || key === "description") {
              newMapping[key] = -1
            } else {
              newMapping[key] = null
            }
          }
        }

        // Assign the field to this column
        if (key === "date" || key === "description") {
          newMapping[key] = colIndex
        } else {
          newMapping[key] = colIndex
        }
      }

      onMappingChange(newMapping)
    },
    [mapping, onMappingChange]
  )

  const validationMessage = useMemo(() => {
    if (isValidMapping(mapping)) return null
    return "กรุณาเลือกคอลัมน์สำหรับ วันที่, รายละเอียด, และ ฝาก หรือ ถอน อย่างน้อย 1 คอลัมน์"
  }, [mapping])

  if (columnCount === 0) return null

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columnCount }, (_, colIndex) => (
                <TableHead
                  key={colIndex}
                  className="min-w-[120px] p-2"
                >
                  <Select
                    value={getSelectedOption(mapping, colIndex)}
                    onValueChange={(value) =>
                      handleColumnChange(colIndex, value)
                    }
                  >
                    <SelectTrigger
                      className="w-full"
                      aria-label={`เลือกประเภทข้อมูลสำหรับคอลัมน์ ${colIndex + 1}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLUMN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Original file header row if present */}
            {headerRow.length > 0 && (
              <TableRow className="bg-muted/30">
                {Array.from({ length: columnCount }, (_, colIndex) => {
                  const isSkipped =
                    getSelectedOption(mapping, colIndex) === "skip"
                  return (
                    <TableCell
                      key={colIndex}
                      className={`text-sm font-medium ${
                        isSkipped
                          ? "text-muted-foreground/50"
                          : "text-foreground"
                      }`}
                    >
                      {headerRow[colIndex] ?? ""}
                    </TableCell>
                  )
                })}
              </TableRow>
            )}

            {/* Data preview rows (first 3) */}
            {dataRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columnCount }, (_, colIndex) => {
                  const isSkipped =
                    getSelectedOption(mapping, colIndex) === "skip"
                  return (
                    <TableCell
                      key={colIndex}
                      className={`bg-muted/50 rounded text-sm font-medium ${
                        isSkipped
                          ? "text-muted-foreground/50"
                          : "text-muted-foreground"
                      }`}
                    >
                      {row[colIndex] ?? ""}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Validation message */}
      {validationMessage && (
        <p className="text-sm text-destructive">
          {validationMessage}
        </p>
      )}
    </div>
  )
}
