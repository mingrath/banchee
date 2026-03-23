"use server"

import { businessProfileSchema } from "@/forms/business-profile"
import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { updateBusinessProfile } from "@/models/business-profile"
import { updateSettings } from "@/models/settings"
import { revalidatePath } from "next/cache"

export async function saveBusinessProfileAction(
  _prevState: ActionState<void> | null,
  formData: FormData
): Promise<ActionState<void>> {
  try {
    const user = await getCurrentUser()
    const rawData = Object.fromEntries(formData.entries())
    const validatedForm = businessProfileSchema.safeParse(rawData)

    if (!validatedForm.success) {
      return { success: false, error: validatedForm.error.message }
    }

    await updateBusinessProfile(user.id, {
      biz_company_name: validatedForm.data.biz_company_name,
      biz_tax_id: validatedForm.data.biz_tax_id,
      biz_branch: validatedForm.data.biz_branch,
      biz_address: validatedForm.data.biz_address,
      biz_vat_registered: validatedForm.data.biz_vat_registered,
      biz_vat_reg_date: validatedForm.data.biz_vat_reg_date,
      biz_fiscal_year_start: validatedForm.data.biz_fiscal_year_start,
    })

    revalidatePath("/setup")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Failed to save business profile:", error)
    return { success: false, error: "Failed to save business profile" }
  }
}

export async function saveLLMSettingsAction(
  _prevState: ActionState<void> | null,
  formData: FormData
): Promise<ActionState<void>> {
  try {
    const user = await getCurrentUser()

    const llmProviders = formData.get("llm_providers") as string
    const openaiApiKey = formData.get("openai_api_key") as string
    const openaiModelName = formData.get("openai_model_name") as string
    const googleApiKey = formData.get("google_api_key") as string
    const googleModelName = formData.get("google_model_name") as string
    const mistralApiKey = formData.get("mistral_api_key") as string
    const mistralModelName = formData.get("mistral_model_name") as string

    if (llmProviders) {
      await updateSettings(user.id, "llm_providers", llmProviders)
    }
    if (openaiApiKey) {
      await updateSettings(user.id, "openai_api_key", openaiApiKey)
    }
    if (openaiModelName) {
      await updateSettings(user.id, "openai_model_name", openaiModelName)
    }
    if (googleApiKey) {
      await updateSettings(user.id, "google_api_key", googleApiKey)
    }
    if (googleModelName) {
      await updateSettings(user.id, "google_model_name", googleModelName)
    }
    if (mistralApiKey) {
      await updateSettings(user.id, "mistral_api_key", mistralApiKey)
    }
    if (mistralModelName) {
      await updateSettings(user.id, "mistral_model_name", mistralModelName)
    }

    revalidatePath("/setup")
    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("Failed to save LLM settings:", error)
    return { success: false, error: "Failed to save LLM settings" }
  }
}
