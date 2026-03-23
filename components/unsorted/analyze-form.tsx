"use client"

import { useNotification } from "@/app/(app)/context"
import { analyzeFileAction, deleteUnsortedFileAction, saveFileAsTransactionAction } from "@/app/(app)/unsorted/actions"
import { CurrencyConverterTool } from "@/components/agents/currency-converter"
import { ItemsDetectTool } from "@/components/agents/items-detect"
import ToolWindow from "@/components/agents/tool-window"
import { FormError } from "@/components/forms/error"
import { FormSelectCategory } from "@/components/forms/select-category"
import { FormSelectCurrency } from "@/components/forms/select-currency"
import { FormSelectProject } from "@/components/forms/select-project"
import { FormSelectType } from "@/components/forms/select-type"
import { FormInput, FormSelect, FormTextarea } from "@/components/forms/simple"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ValidationBadge, TaxInvoiceValidationSummary, FIELD_VALIDATION_MAP } from "@/components/unsorted/tax-invoice-validation"
import { extractVATFromTotal, formatSatangToDisplay, WHT_RATE_OPTIONS } from "@/services/tax-calculator"
import type { ValidationResult } from "@/ai/validators/tax-invoice-validator"
import type { NonDeductibleFlag } from "@/ai/validators/non-deductible-validator"
import { Category, Currency, Field, File, Project } from "@/prisma/client"
import { format } from "date-fns"
import { AlertTriangle, ArrowDownToLine, Brain, Loader2, Trash2 } from "lucide-react"
import { startTransition, useActionState, useCallback, useMemo, useState } from "react"

const VAT_TYPE_OPTIONS = [
  { code: "input", name: "ภาษีซื้อ" },
  { code: "output", name: "ภาษีขาย" },
  { code: "none", name: "ไม่มี VAT" },
]

export default function AnalyzeForm({
  file,
  categories,
  projects,
  currencies,
  fields,
  settings,
}: {
  file: File
  categories: Category[]
  projects: Project[]
  currencies: Currency[]
  fields: Field[]
  settings: Record<string, string>
}) {
  const { showNotification } = useNotification()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeStep, setAnalyzeStep] = useState<string>("")
  const [analyzeError, setAnalyzeError] = useState<string>("")
  const [deleteState, deleteAction, isDeleting] = useActionState(deleteUnsortedFileAction, null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [nonDeductibleFlag, setNonDeductibleFlag] = useState<NonDeductibleFlag | null>(null)

  const fieldMap = useMemo(() => {
    return fields.reduce(
      (acc, field) => {
        acc[field.code] = field
        return acc
      },
      {} as Record<string, Field>
    )
  }, [fields])

  const extraFields = useMemo(() => fields.filter((field) => field.isExtra), [fields])
  const initialFormState = useMemo(() => {
    const baseState: Record<string, unknown> = {
      name: file.filename,
      merchant: "",
      description: "",
      type: settings.default_type,
      total: 0.0,
      currencyCode: settings.default_currency,
      convertedTotal: 0.0,
      convertedCurrencyCode: settings.default_currency,
      categoryCode: settings.default_category,
      projectCode: settings.default_project,
      issuedAt: "",
      note: "",
      text: "",
      items: [],
      // VAT fields
      vatType: "none",
      subtotal: 0.0,
      vatAmount: 0.0,
      merchantTaxId: "",
      merchantBranch: "00000",
      documentNumber: "",
      // WHT fields
      whtRate: 0,
      whtAmount: 0,
      whtType: "",
    }

    // Add extra fields
    const extraFieldsState = extraFields.reduce(
      (acc, field) => {
        acc[field.code] = ""
        return acc
      },
      {} as Record<string, string>
    )

    // Load cached results if they exist
    const cachedResults = file.cachedParseResult
      ? Object.fromEntries(
          Object.entries(file.cachedParseResult as Record<string, string>).filter(
            ([_, value]) => value !== null && value !== undefined && value !== ""
          )
        )
      : {}

    return {
      ...baseState,
      ...extraFieldsState,
      ...cachedResults,
    }
  }, [file.filename, settings, extraFields, file.cachedParseResult])
  const [formData, setFormData] = useState(initialFormState)

  /** Auto-compute subtotal and vatAmount when total changes and vatType is not "none" */
  const handleTotalChange = useCallback((newTotal: number) => {
    setFormData((prev) => {
      if (prev.vatType !== "none" && newTotal > 0) {
        const totalSatang = Math.round(newTotal * 100)
        const result = extractVATFromTotal(totalSatang)
        return {
          ...prev,
          total: newTotal,
          subtotal: formatSatangToDisplay(result.subtotal),
          vatAmount: formatSatangToDisplay(result.vatAmount),
        }
      }
      return { ...prev, total: newTotal }
    })
  }, [])

  /** Auto-compute when VAT type changes */
  const handleVatTypeChange = useCallback((newVatType: string) => {
    setFormData((prev) => {
      const total = Number(prev.total) || 0
      if (newVatType !== "none" && total > 0) {
        const totalSatang = Math.round(total * 100)
        const result = extractVATFromTotal(totalSatang)
        return {
          ...prev,
          vatType: newVatType,
          subtotal: formatSatangToDisplay(result.subtotal),
          vatAmount: formatSatangToDisplay(result.vatAmount),
        }
      } else if (newVatType === "none") {
        return { ...prev, vatType: newVatType, subtotal: 0, vatAmount: 0 }
      }
      return { ...prev, vatType: newVatType }
    })
  }, [])

  /** Look up validation status for a given form field code */
  const getFieldValidation = useCallback(
    (fieldCode: string) => {
      if (!validation) return null
      const validationKey = FIELD_VALIDATION_MAP[fieldCode]
      if (!validationKey) return null
      return validation.fields[validationKey] ?? null
    },
    [validation]
  )

  async function saveAsTransaction(formData: FormData) {
    setSaveError("")
    setIsSaving(true)
    startTransition(async () => {
      const result = await saveFileAsTransactionAction(null, formData)
      setIsSaving(false)

      if (result.success) {
        showNotification({ code: "global.banner", message: "บันทึกสำเร็จ", type: "success" })
        showNotification({ code: "sidebar.transactions", message: "new" })
        setTimeout(() => showNotification({ code: "sidebar.transactions", message: "" }), 3000)
      } else {
        setSaveError(result.error ? result.error : "เกิดข้อผิดพลาด...")
        showNotification({ code: "global.banner", message: "บันทึกไม่สำเร็จ", type: "failed" })
      }
    })
  }

  const startAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalyzeError("")
    setValidation(null)
    try {
      setAnalyzeStep("กำลังวิเคราะห์...")
      const results = await analyzeFileAction(file, settings, fields, categories, projects)

      console.log("Analysis results:", results)

      if (!results.success) {
        setAnalyzeError(results.error ? results.error : "วิเคราะห์ไม่สำเร็จ -- ลองอัปโหลดภาพที่ชัดขึ้นหรือลองใหม่อีกครั้ง")
      } else {
        const output = results.data?.output || {}
        const nonEmptyFields = Object.fromEntries(
          Object.entries(output).filter(
            ([key, value]) => key !== "_validation" && value !== null && value !== undefined && value !== ""
          )
        )

        // Map AI-extracted fields to form state
        const mapped: Record<string, unknown> = { ...nonEmptyFields }

        // Map snake_case AI fields to camelCase form fields
        if (output.merchant_tax_id) mapped.merchantTaxId = output.merchant_tax_id
        if (output.merchant_branch) mapped.merchantBranch = output.merchant_branch
        if (output.document_number) mapped.documentNumber = output.document_number
        if (output.vat_amount) mapped.vatAmount = Number(output.vat_amount) || 0
        if (output.vat_type) mapped.vatType = output.vat_type

        // Map WHT fields from AI
        if (output.wht_rate !== undefined) mapped.whtRate = Number(output.wht_rate) || 0
        if (output.wht_type) mapped.whtType = output.wht_type

        // Auto-compute subtotal if we have total and vatAmount
        const total = Number(mapped.total || formData.total) || 0
        const vatAmountFromAI = Number(mapped.vatAmount) || 0
        if (total > 0 && vatAmountFromAI > 0) {
          // Both values from AI in display units
          mapped.subtotal = total - vatAmountFromAI
        } else if (total > 0 && mapped.vatType && mapped.vatType !== "none") {
          const totalSatang = Math.round(total * 100)
          const result = extractVATFromTotal(totalSatang)
          mapped.subtotal = formatSatangToDisplay(result.subtotal)
          mapped.vatAmount = formatSatangToDisplay(result.vatAmount)
        }

        // Auto-compute WHT amount if whtRate and subtotal are available
        const whtRateVal = Number(mapped.whtRate) || 0
        const subtotalForWht = Number(mapped.subtotal) || 0
        if (whtRateVal > 0 && subtotalForWht > 0) {
          const subtotalSatang = Math.round(subtotalForWht * 100)
          mapped.whtAmount = Math.round(subtotalSatang * whtRateVal / 10000) / 100
        }

        setFormData((prev) => ({ ...prev, ...mapped }))

        // Set validation result
        const validationData = (output as Record<string, unknown>)._validation as ValidationResult | undefined
        if (validationData) {
          setValidation(validationData)
        }

        // Set non-deductible flag
        const ndData = output as Record<string, unknown>
        if (ndData.is_non_deductible === true) {
          setNonDeductibleFlag({
            isNonDeductible: true,
            category: (ndData.non_deductible_category as string) || "",
            reason: (ndData.non_deductible_reason as string) || "",
            severity: ["penalty", "personal", "provision", "no_recipient", "cit_payment", "capital"].includes(
              ndData.non_deductible_category as string
            )
              ? "warning"
              : "info",
          })
        } else {
          setNonDeductibleFlag(null)
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error)
      setAnalyzeError(error instanceof Error ? error.message : "วิเคราะห์ไม่สำเร็จ")
    } finally {
      setIsAnalyzing(false)
      setAnalyzeStep("")
    }
  }

  return (
    <>
      {file.isSplitted ? (
        <div className="flex justify-end">
          <Badge variant="outline">ไฟล์นี้ถูกแยกรายการแล้ว</Badge>
        </div>
      ) : (
        <Button className="w-full mb-6 py-6 text-lg" onClick={startAnalyze} disabled={isAnalyzing} data-analyze-button>
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              <span>{analyzeStep}</span>
            </>
          ) : (
            <>
              <Brain className="mr-1 h-4 w-4" />
              <span>วิเคราะห์</span>
            </>
          )}
        </Button>
      )}

      <div>{analyzeError && <FormError>{analyzeError}</FormError>}</div>

      <form className="space-y-4" action={saveAsTransaction}>
        <input type="hidden" name="fileId" value={file.id} />
        <FormInput
          title="ชื่อรายการ"
          name="name"
          value={formData.name as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          required={fieldMap.name?.isRequired}
        />

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormInput
              title="ผู้ขาย/ผู้ให้บริการ"
              name="merchant"
              value={formData.merchant as string}
              onChange={(e) => setFormData((prev) => ({ ...prev, merchant: e.target.value }))}
              hideIfEmpty={!fieldMap.merchant?.isVisibleInAnalysis}
              required={fieldMap.merchant?.isRequired}
            />
          </div>
          {getFieldValidation("merchant") && (
            <ValidationBadge {...getFieldValidation("merchant")!} />
          )}
        </div>

        <FormInput
          title="รายละเอียด"
          name="description"
          value={formData.description as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
          hideIfEmpty={!fieldMap.description?.isVisibleInAnalysis}
          required={fieldMap.description?.isRequired}
        />

        <div className="flex flex-wrap gap-4">
          <FormInput
            title="จำนวนเงิน"
            name="total"
            type="number"
            step="0.01"
            value={(formData.total as number) || ""}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value || "0")
              if (!isNaN(newValue)) handleTotalChange(newValue)
            }}
            className="w-32"
            required={fieldMap.total?.isRequired}
          />

          <FormSelectCurrency
            title="สกุลเงิน"
            currencies={currencies}
            name="currencyCode"
            value={formData.currencyCode as string}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, currencyCode: value }))}
            hideIfEmpty={!fieldMap.currencyCode?.isVisibleInAnalysis}
            required={fieldMap.currencyCode?.isRequired}
          />

          <FormSelectType
            title="ประเภท"
            name="type"
            value={formData.type as string}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}
            hideIfEmpty={!fieldMap.type?.isVisibleInAnalysis}
            required={fieldMap.type?.isRequired}
          />
        </div>

        {(formData.total as number) != 0 && Boolean(formData.currencyCode) && formData.currencyCode !== settings.default_currency && (
          <ToolWindow title={`Exchange rate on ${format(new Date((formData.issuedAt as string) || Date.now()), "LLLL dd, yyyy")}`}>
            <CurrencyConverterTool
              originalTotal={formData.total as number}
              originalCurrencyCode={formData.currencyCode as string}
              targetCurrencyCode={settings.default_currency}
              date={new Date((formData.issuedAt as string) || Date.now())}
              onChange={(value) => setFormData((prev) => ({ ...prev, convertedTotal: value }))}
            />
            <input type="hidden" name="convertedCurrencyCode" value={settings.default_currency} />
          </ToolWindow>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormInput
              title="วันที่"
              type="date"
              name="issuedAt"
              value={formData.issuedAt as string}
              onChange={(e) => setFormData((prev) => ({ ...prev, issuedAt: e.target.value }))}
              hideIfEmpty={!fieldMap.issuedAt?.isVisibleInAnalysis}
              required={fieldMap.issuedAt?.isRequired}
            />
          </div>
          {getFieldValidation("issuedAt") && (
            <ValidationBadge {...getFieldValidation("issuedAt")!} />
          )}
        </div>

        <div className="flex flex-row gap-4">
          <FormSelectCategory
            title="หมวดหมู่"
            categories={categories}
            name="categoryCode"
            value={formData.categoryCode as string}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, categoryCode: value }))}
            placeholder="เลือกหมวดหมู่"
            hideIfEmpty={!fieldMap.categoryCode?.isVisibleInAnalysis}
            required={fieldMap.categoryCode?.isRequired}
          />

          {projects.length > 0 && (
            <FormSelectProject
              title="โปรเจกต์"
              projects={projects}
              name="projectCode"
              value={formData.projectCode as string}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, projectCode: value }))}
              placeholder="เลือกโปรเจกต์"
              hideIfEmpty={!fieldMap.projectCode?.isVisibleInAnalysis}
              required={fieldMap.projectCode?.isRequired}
            />
          )}
        </div>

        <FormInput
          title="หมายเหตุ"
          name="note"
          value={formData.note as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
          hideIfEmpty={!fieldMap.note?.isVisibleInAnalysis}
          required={fieldMap.note?.isRequired}
        />

        {/* ---- Tax Information Section (ข้อมูลภาษี) ---- */}
        <div className="space-y-4 border-t pt-4 mt-4">
          <h3 className="text-sm font-bold text-foreground">ข้อมูลภาษี</h3>

          {validation && <TaxInvoiceValidationSummary validation={validation} />}

          {nonDeductibleFlag?.isNonDeductible && (
            <div
              className={`rounded-lg border p-3 ${
                nonDeductibleFlag.severity === "warning"
                  ? "border-destructive/50 bg-destructive/10"
                  : "border-amber-500/50 bg-amber-500/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${
                    nonDeductibleFlag.severity === "warning" ? "text-destructive" : "text-amber-500"
                  }`}
                />
                <span className="text-sm font-medium">
                  {nonDeductibleFlag.severity === "warning" ? "รายจ่ายต้องห้าม" : "รายจ่ายต้องห้ามบางส่วน"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{nonDeductibleFlag.reason}</p>
            </div>
          )}

          <FormSelect
            title="ประเภทภาษี"
            name="vatType"
            items={VAT_TYPE_OPTIONS}
            value={formData.vatType as string}
            onValueChange={handleVatTypeChange}
            placeholder="เลือกประเภทภาษี"
          />

          {formData.vatType !== "none" && (
            <>
              <div className="flex flex-wrap gap-4">
                <FormInput
                  title="ยอดก่อน VAT"
                  name="subtotal"
                  type="number"
                  step="0.01"
                  value={(formData.subtotal as number) || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value || "0")
                    if (!isNaN(val)) setFormData((prev) => ({ ...prev, subtotal: val }))
                  }}
                  className="w-40"
                />

                <FormInput
                  title="จำนวน VAT"
                  name="vatAmount"
                  type="number"
                  step="0.01"
                  value={(formData.vatAmount as number) || ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value || "0")
                    if (!isNaN(val)) setFormData((prev) => ({ ...prev, vatAmount: val }))
                  }}
                  className="w-40"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormInput
                    title="เลขประจำตัวผู้เสียภาษี (ผู้ขาย)"
                    name="merchantTaxId"
                    value={formData.merchantTaxId as string}
                    onChange={(e) => setFormData((prev) => ({ ...prev, merchantTaxId: e.target.value }))}
                    maxLength={13}
                    placeholder="0000000000000"
                  />
                </div>
                {getFieldValidation("merchant_tax_id") && (
                  <ValidationBadge {...getFieldValidation("merchant_tax_id")!} />
                )}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormInput
                    title="สาขา"
                    name="merchantBranch"
                    value={formData.merchantBranch as string}
                    onChange={(e) => setFormData((prev) => ({ ...prev, merchantBranch: e.target.value }))}
                    placeholder="00000"
                  />
                </div>
                {getFieldValidation("merchant_branch") && (
                  <ValidationBadge {...getFieldValidation("merchant_branch")!} />
                )}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <FormInput
                    title="เลขที่เอกสาร"
                    name="documentNumber"
                    value={formData.documentNumber as string}
                    onChange={(e) => setFormData((prev) => ({ ...prev, documentNumber: e.target.value }))}
                    placeholder="INV-XXXXXXXX"
                  />
                </div>
                {getFieldValidation("document_number") && (
                  <ValidationBadge {...getFieldValidation("document_number")!} />
                )}
              </div>
            </>
          )}
        </div>

        {/* ---- WHT Section (ภาษีหัก ณ ที่จ่าย) ---- */}
        {formData.type === "expense" && (
          <div className="space-y-4 border-t pt-4 mt-4">
            <h3 className="text-sm font-bold text-foreground">ภาษีหัก ณ ที่จ่าย</h3>

            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">อัตราภาษีหัก ณ ที่จ่าย</label>
              <Select
                value={String(formData.whtRate || 0)}
                onValueChange={(value) => {
                  const selectedRate = parseInt(value, 10)
                  setFormData((prev) => {
                    const subtotalVal = Number(prev.subtotal) || 0
                    const subtotalSatang = Math.round(subtotalVal * 100)
                    const whtAmountSatang = selectedRate > 0 && subtotalSatang > 0
                      ? Math.round(subtotalSatang * selectedRate / 10000)
                      : 0
                    return {
                      ...prev,
                      whtRate: selectedRate,
                      whtAmount: whtAmountSatang / 100,
                    }
                  })
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกอัตราหัก ณ ที่จ่าย" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">ไม่หัก ณ ที่จ่าย</SelectItem>
                  {WHT_RATE_OPTIONS.map((option) => (
                    <SelectItem key={option.rate} value={String(option.rate)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="whtRate" value={String(formData.whtRate || 0)} />
            </div>

            {Number(formData.whtRate) > 0 && (
              <>
                <div className="text-sm text-muted-foreground">
                  จำนวนเงินภาษีหัก ณ ที่จ่าย:{" "}
                  <span className="font-medium text-foreground">
                    {Number(formData.whtAmount || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                  </span>
                </div>
                <input type="hidden" name="whtAmount" value={String(Math.round(Number(formData.whtAmount || 0) * 100))} />

                <div className="space-y-1">
                  <label className="text-sm text-muted-foreground">แบบนำส่ง</label>
                  <Select
                    value={(formData.whtType as string) || "pnd53"}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, whtType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกแบบนำส่ง" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pnd3">ภ.ง.ด.3 (บุคคลธรรมดา)</SelectItem>
                      <SelectItem value="pnd53">ภ.ง.ด.53 (นิติบุคคล)</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="whtType" value={(formData.whtType as string) || ""} />
                </div>
              </>
            )}
          </div>
        )}

        {extraFields.map((field) => (
          <FormInput
            key={field.code}
            type="text"
            title={field.name}
            name={field.code}
            value={formData[field.code as keyof typeof formData] as string}
            onChange={(e) => setFormData((prev) => ({ ...prev, [field.code]: e.target.value }))}
            hideIfEmpty={!field.isVisibleInAnalysis}
            required={field.isRequired}
          />
        ))}

        {Array.isArray(formData.items) && (formData.items as unknown[]).length > 0 && (
          <ToolWindow title="Detected items">
            <ItemsDetectTool file={file} data={formData} />
          </ToolWindow>
        )}

        <div className="hidden">
          <input type="text" name="items" value={JSON.stringify(formData.items)} readOnly />
          <FormTextarea
            title="ข้อความที่สกัดได้"
            name="text"
            value={formData.text as string}
            onChange={(e) => setFormData((prev) => ({ ...prev, text: e.target.value }))}
            hideIfEmpty={!fieldMap.text?.isVisibleInAnalysis}
          />
        </div>

        <div className="flex justify-between gap-4 pt-6">
          <Button
            type="button"
            onClick={() => startTransition(() => deleteAction(file.id))}
            variant="destructive"
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "กำลังลบ..." : "ลบ"}
          </Button>

          <Button type="submit" disabled={isSaving} data-save-button>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <ArrowDownToLine className="h-4 w-4" />
                บันทึกรายการ
              </>
            )}
          </Button>
        </div>

        <div>
          {deleteState?.error && <FormError>{deleteState.error}</FormError>}
          {saveError && <FormError>{saveError}</FormError>}
        </div>
      </form>
    </>
  )
}
