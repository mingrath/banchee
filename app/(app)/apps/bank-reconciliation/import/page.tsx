"use client"

import { useActionState, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormError } from "@/components/forms/error"
import { BANK_PRESETS, type ColumnMapping } from "@/services/bank-statement-parser"
import { importBankStatementAction } from "@/app/(app)/apps/bank-reconciliation/actions"
import StatementUpload from "@/app/(app)/apps/bank-reconciliation/components/statement-upload"
import ColumnMapper, {
  isValidMapping,
} from "@/app/(app)/apps/bank-reconciliation/components/column-mapper"

export const dynamic = "force-dynamic"

const DEFAULT_MAPPING: ColumnMapping = {
  date: -1,
  description: -1,
  deposit: null,
  withdrawal: null,
  balance: null,
  reference: null,
}

export default function ImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [bankPreset, setBankPreset] = useState<string>("other")
  const [columnMapping, setColumnMapping] =
    useState<ColumnMapping>(DEFAULT_MAPPING)
  const [encoding, setEncoding] = useState<string>("utf-8")

  const handleFileLoaded = useCallback(
    (loadedFile: File, rows: string[][], detectedEncoding: string) => {
      setFile(loadedFile)
      setPreviewRows(rows)
      setEncoding(detectedEncoding)

      // Auto-detect bank preset from encoding if TIS-620 detected (likely KBank)
      if (detectedEncoding === "windows-874") {
        setBankPreset("kbank")
        setColumnMapping(BANK_PRESETS["kbank"].defaultMapping)
      }
    },
    []
  )

  const handleBankPresetChange = useCallback(
    (preset: string) => {
      setBankPreset(preset)
      // Apply preset's default column mapping
      if (preset !== "other" && BANK_PRESETS[preset]) {
        setColumnMapping(BANK_PRESETS[preset].defaultMapping)
      } else {
        // Reset to default for "other"
        setColumnMapping(DEFAULT_MAPPING)
      }
    },
    []
  )

  const handleMappingChange = useCallback((newMapping: ColumnMapping) => {
    setColumnMapping(newMapping)
  }, [])

  // Form submission via useActionState
  const [state, formAction, isPending] = useActionState(
    async (
      prevState: { success: boolean; error?: string | null; data?: { statementId: string } | null } | null,
      formData: FormData
    ) => {
      if (!file) {
        return { success: false, error: "กรุณาเลือกไฟล์" }
      }

      // Build FormData with all required fields
      const submitData = new FormData()
      submitData.set("file", file)
      submitData.set("bankName", bankPreset)

      // Set skip lines from preset
      const preset = BANK_PRESETS[bankPreset]
      submitData.set("skipLines", String(preset?.defaultSkipLines ?? 1))

      // Set column mapping indices
      submitData.set("mapping_date", String(columnMapping.date))
      submitData.set("mapping_description", String(columnMapping.description))
      if (columnMapping.deposit !== null) {
        submitData.set("mapping_deposit", String(columnMapping.deposit))
      }
      if (columnMapping.withdrawal !== null) {
        submitData.set("mapping_withdrawal", String(columnMapping.withdrawal))
      }
      if (columnMapping.balance !== null) {
        submitData.set("mapping_balance", String(columnMapping.balance))
      }
      if (columnMapping.reference !== null) {
        submitData.set("mapping_reference", String(columnMapping.reference))
      }

      const result = await importBankStatementAction(null, submitData)

      if (result.success && result.data?.statementId) {
        router.push(`/apps/bank-reconciliation/${result.data.statementId}`)
      }

      return result
    },
    null
  )

  const isSubmitDisabled =
    !file || !isValidMapping(columnMapping) || isPending

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/apps/bank-reconciliation"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับรายการ
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">
          นำเข้ารายการธนาคาร
        </h2>
      </div>

      {/* Import form */}
      <form action={formAction} className="space-y-6">
        {/* Step 1: File upload + bank preset */}
        <StatementUpload
          onFileLoaded={handleFileLoaded}
          bankPreset={bankPreset}
          onBankPresetChange={handleBankPresetChange}
        />

        {/* Step 2: Column mapping (visible after file loaded with preview rows) */}
        {file && previewRows.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">
              จับคู่คอลัมน์
            </h3>
            <p className="text-sm text-muted-foreground">
              เลือกประเภทข้อมูลให้ตรงกับคอลัมน์ในไฟล์ของคุณ
            </p>
            <ColumnMapper
              previewRows={previewRows}
              mapping={columnMapping}
              onMappingChange={handleMappingChange}
            />
          </div>
        )}

        {/* Error display */}
        {state && !state.success && state.error && (
          <FormError>{state.error}</FormError>
        )}

        {/* Submit button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={isSubmitDisabled}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังนำเข้า...
              </>
            ) : (
              "นำเข้าและจับคู่อัตโนมัติ"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
