"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import WizardStepIndicator from "./wizard-step-indicator"
import { saveBusinessProfileAction, saveLLMSettingsAction } from "../actions"
import { type BusinessProfile } from "@/models/business-profile"
import { type SettingsMap } from "@/models/settings"
import { PROVIDERS } from "@/lib/llm-providers"

const TOTAL_STEPS = 7

const STEP_TITLES = [
  "ชื่อบริษัท",
  "เลขประจำตัวผู้เสียภาษี",
  "สาขา",
  "ที่อยู่",
  "การจดทะเบียน VAT",
  "รอบบัญชี",
  "ตั้งค่า AI",
]

const THAI_MONTHS: Record<string, string> = {
  "1": "มกราคม",
  "2": "กุมภาพันธ์",
  "3": "มีนาคม",
  "4": "เมษายน",
  "5": "พฤษภาคม",
  "6": "มิถุนายน",
  "7": "กรกฎาคม",
  "8": "สิงหาคม",
  "9": "กันยายน",
  "10": "ตุลาคม",
  "11": "พฤศจิกายน",
  "12": "ธันวาคม",
}

interface SetupWizardProps {
  initialProfile: BusinessProfile
  settings: SettingsMap
}

export default function SetupWizard({ initialProfile, settings }: SetupWizardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState<"forward" | "backward">("forward")

  const [formData, setFormData] = useState({
    biz_company_name: initialProfile.companyName || "",
    biz_tax_id: initialProfile.taxId || "",
    biz_branch: initialProfile.branch || "00000",
    biz_address: initialProfile.address || "",
    biz_vat_registered: initialProfile.vatRegistered ? "true" : "false",
    biz_vat_reg_date: initialProfile.vatRegDate || "",
    biz_fiscal_year_start: String(initialProfile.fiscalYearStart || 1),
  })

  const [llmData, setLlmData] = useState({
    llm_providers: settings.llm_providers || "openai,google,mistral",
    selectedProvider: (settings.llm_providers || "openai,google,mistral").split(",")[0]?.trim() || "openai",
    openai_api_key: settings.openai_api_key || "",
    openai_model_name: settings.openai_model_name || "gpt-4o-mini",
    google_api_key: settings.google_api_key || "",
    google_model_name: settings.google_model_name || "gemini-2.5-flash",
    mistral_api_key: settings.mistral_api_key || "",
    mistral_model_name: settings.mistral_model_name || "mistral-medium-latest",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  function updateFormField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateLlmField(field: string, value: string) {
    setLlmData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function validateCurrentStep(): boolean {
    const newErrors: Record<string, string> = {}

    switch (currentStep) {
      case 1:
        if (!formData.biz_company_name || formData.biz_company_name.length < 2) {
          newErrors.biz_company_name = "กรุณากรอกชื่อบริษัท (อย่างน้อย 2 ตัวอักษร)"
        }
        break
      case 2:
        if (!/^\d{13}$/.test(formData.biz_tax_id)) {
          newErrors.biz_tax_id = "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก"
        }
        break
      case 3:
        if (!formData.biz_branch) {
          newErrors.biz_branch = "กรุณาเลือกสาขา"
        }
        break
      case 4:
        if (!formData.biz_address) {
          newErrors.biz_address = "กรุณากรอกที่อยู่"
        }
        break
      case 5:
        // VAT registration is optional - always valid
        break
      case 6:
        if (!/^(1[0-2]|[1-9])$/.test(formData.biz_fiscal_year_start)) {
          newErrors.biz_fiscal_year_start = "กรุณาเลือกเดือนเริ่มต้นรอบบัญชี"
        }
        break
      case 7: {
        const provider = llmData.selectedProvider
        const apiKeyField = `${provider}_api_key` as keyof typeof llmData
        if (!llmData[apiKeyField]) {
          newErrors.llm_api_key = "กรุณากรอก API Key"
        }
        break
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleNext() {
    if (!validateCurrentStep()) return

    if (currentStep < TOTAL_STEPS) {
      setDirection("forward")
      setCurrentStep((prev) => prev + 1)
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setDirection("backward")
      setCurrentStep((prev) => prev - 1)
    }
  }

  function handleSubmit() {
    if (!validateCurrentStep()) return

    startTransition(async () => {
      // Save business profile
      const profileFormData = new FormData()
      for (const [key, value] of Object.entries(formData)) {
        profileFormData.append(key, value)
      }

      const profileResult = await saveBusinessProfileAction(null, profileFormData)
      if (!profileResult.success) {
        toast.error(profileResult.error || "กรุณากรอกข้อมูลให้ครบถ้วน")
        return
      }

      // Save LLM settings
      const llmFormData = new FormData()
      llmFormData.append("llm_providers", llmData.selectedProvider)
      llmFormData.append("openai_api_key", llmData.openai_api_key)
      llmFormData.append("openai_model_name", llmData.openai_model_name)
      llmFormData.append("google_api_key", llmData.google_api_key)
      llmFormData.append("google_model_name", llmData.google_model_name)
      llmFormData.append("mistral_api_key", llmData.mistral_api_key)
      llmFormData.append("mistral_model_name", llmData.mistral_model_name)

      const llmResult = await saveLLMSettingsAction(null, llmFormData)
      if (!llmResult.success) {
        toast.error(llmResult.error || "ไม่สามารถบันทึกการตั้งค่า AI ได้")
        return
      }

      toast.success("ตั้งค่าเสร็จสิ้น -- ยินดีต้อนรับ!")
      router.push("/dashboard")
    })
  }

  function renderStepContent() {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biz_company_name">ชื่อบริษัท / ชื่อกิจการ</Label>
              <Input
                id="biz_company_name"
                placeholder="เช่น บริษัท ตัวอย่าง จำกัด"
                value={formData.biz_company_name}
                onChange={(e) => updateFormField("biz_company_name", e.target.value)}
              />
              {errors.biz_company_name && (
                <p className="text-sm text-destructive">{errors.biz_company_name}</p>
              )}
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biz_tax_id">เลขประจำตัวผู้เสียภาษี (13 หลัก)</Label>
              <Input
                id="biz_tax_id"
                placeholder="0000000000000"
                maxLength={13}
                value={formData.biz_tax_id}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 13)
                  updateFormField("biz_tax_id", value)
                }}
              />
              {errors.biz_tax_id && (
                <p className="text-sm text-destructive">{errors.biz_tax_id}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.biz_tax_id.length}/13 หลัก
              </p>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biz_branch">สาขา</Label>
              <Select
                value={formData.biz_branch}
                onValueChange={(value) => updateFormField("biz_branch", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกสาขา" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="00000">สำนักงานใหญ่</SelectItem>
                  <SelectItem value="custom">สาขาอื่น...</SelectItem>
                </SelectContent>
              </Select>
              {formData.biz_branch !== "00000" && formData.biz_branch !== "custom" && (
                <Input
                  placeholder="เลขที่สาขา (5 หลัก)"
                  maxLength={5}
                  value={formData.biz_branch}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 5)
                    updateFormField("biz_branch", value)
                  }}
                />
              )}
              {formData.biz_branch === "custom" && (
                <Input
                  placeholder="เลขที่สาขา (5 หลัก)"
                  maxLength={5}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 5)
                    if (value) {
                      updateFormField("biz_branch", value)
                    }
                  }}
                />
              )}
              {errors.biz_branch && (
                <p className="text-sm text-destructive">{errors.biz_branch}</p>
              )}
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biz_address">ที่อยู่</Label>
              <Textarea
                id="biz_address"
                placeholder="ที่อยู่สำหรับออกใบกำกับภาษี"
                rows={4}
                value={formData.biz_address}
                onChange={(e) => updateFormField("biz_address", e.target.value)}
              />
              {errors.biz_address && (
                <p className="text-sm text-destructive">{errors.biz_address}</p>
              )}
            </div>
          </div>
        )
      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="biz_vat_registered">จดทะเบียนภาษีมูลค่าเพิ่ม (VAT)</Label>
                <p className="text-xs text-muted-foreground">
                  กิจการที่มีรายได้เกิน 1,800,000 บาท/ปี ต้องจดทะเบียน VAT
                </p>
              </div>
              <Switch
                id="biz_vat_registered"
                checked={formData.biz_vat_registered === "true"}
                onCheckedChange={(checked) =>
                  updateFormField("biz_vat_registered", checked ? "true" : "false")
                }
              />
            </div>
            {formData.biz_vat_registered === "true" && (
              <div className="space-y-2">
                <Label htmlFor="biz_vat_reg_date">วันที่จดทะเบียน VAT</Label>
                <Input
                  id="biz_vat_reg_date"
                  type="date"
                  value={formData.biz_vat_reg_date}
                  onChange={(e) => updateFormField("biz_vat_reg_date", e.target.value)}
                />
              </div>
            )}
          </div>
        )
      case 6:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biz_fiscal_year_start">เดือนเริ่มต้นรอบบัญชี</Label>
              <Select
                value={formData.biz_fiscal_year_start}
                onValueChange={(value) => updateFormField("biz_fiscal_year_start", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเดือน" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(THAI_MONTHS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.biz_fiscal_year_start && (
                <p className="text-sm text-destructive">{errors.biz_fiscal_year_start}</p>
              )}
              <p className="text-xs text-muted-foreground">
                ส่วนใหญ่ใช้รอบปีปฏิทิน (มกราคม - ธันวาคม)
              </p>
            </div>
          </div>
        )
      case 7:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="llm_provider">ผู้ให้บริการ AI</Label>
              <Select
                value={llmData.selectedProvider}
                onValueChange={(value) => updateLlmField("selectedProvider", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกผู้ให้บริการ" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((provider) => (
                    <SelectItem key={provider.key} value={provider.key}>
                      {provider.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {PROVIDERS.filter((p) => p.key === llmData.selectedProvider).map((provider) => (
              <div key={provider.key} className="space-y-2">
                <Label htmlFor={provider.apiKeyName}>API Key ({provider.label})</Label>
                <Input
                  id={provider.apiKeyName}
                  type="password"
                  placeholder={provider.placeholder}
                  value={llmData[provider.apiKeyName as keyof typeof llmData] || ""}
                  onChange={(e) => updateLlmField(provider.apiKeyName, e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  รับ API Key ได้ที่{" "}
                  <a
                    href={provider.apiDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary"
                  >
                    {provider.apiDocLabel}
                  </a>
                </p>
              </div>
            ))}
            {errors.llm_api_key && (
              <p className="text-sm text-destructive">{errors.llm_api_key}</p>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-[480px]">
        <CardHeader>
          <WizardStepIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />
          <CardTitle className="text-center text-lg">
            {STEP_TITLES[currentStep - 1]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            key={currentStep}
            className="animate-in fade-in-0 duration-200"
            style={{
              animationName: direction === "forward" ? "slideInFromRight" : "slideInFromLeft",
            }}
          >
            {renderStepContent()}
          </div>

          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isPending}
            >
              ย้อนกลับ
            </Button>

            {currentStep < TOTAL_STEPS ? (
              <Button onClick={handleNext} disabled={isPending}>
                ถัดไป
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    กำลังบันทึก...
                  </>
                ) : (
                  "เริ่มใช้งาน"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
