"use server"

import { ActionState } from "@/lib/actions"
import { getCurrentUser } from "@/lib/auth"
import { updateBusinessProfile, type BusinessProfile } from "@/models/business-profile"
import { revalidatePath } from "next/cache"

export async function saveBusinessProfileAction(
  _prevState: ActionState<BusinessProfile> | null,
  formData: FormData
): Promise<ActionState<BusinessProfile>> {
  try {
    const user = await getCurrentUser()

    const companyName = (formData.get("companyName") as string) || ""
    const taxId = (formData.get("taxId") as string) || ""
    const branch = (formData.get("branch") as string) || "00000"
    const address = (formData.get("address") as string) || ""
    const vatRegistered = formData.get("vatRegistered") === "on"
    const vatRegDate = (formData.get("vatRegDate") as string) || null
    const fiscalYearStart = parseInt((formData.get("fiscalYearStart") as string) || "1", 10)
    const paidUpCapitalBaht = parseFloat((formData.get("paidUpCapital") as string) || "0")
    const paidUpCapital = !isNaN(paidUpCapitalBaht) ? Math.round(paidUpCapitalBaht * 100) : 0

    // Validate Tax ID if provided
    if (taxId && !/^\d{13}$/.test(taxId)) {
      return { success: false, error: "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก" }
    }

    await updateBusinessProfile(user.id, {
      companyName,
      taxId,
      branch,
      address,
      vatRegistered,
      vatRegDate,
      fiscalYearStart,
      paidUpCapital,
    })

    revalidatePath("/settings")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Failed to save business profile:", error)
    return { success: false, error: "บันทึกข้อมูลธุรกิจไม่สำเร็จ" }
  }
}

export async function resetBusinessProfileAction(
  _prevState: ActionState<null> | null,
  _formData: FormData
): Promise<ActionState<null>> {
  try {
    const user = await getCurrentUser()

    await updateBusinessProfile(user.id, {
      companyName: "",
      taxId: "",
      branch: "00000",
      address: "",
      vatRegistered: false,
      vatRegDate: null,
      fiscalYearStart: 1,
      paidUpCapital: 0,
    })

    revalidatePath("/settings")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Failed to reset business profile:", error)
    return { success: false, error: "รีเซ็ตข้อมูลธุรกิจไม่สำเร็จ" }
  }
}
