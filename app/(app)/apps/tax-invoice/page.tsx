import { getCurrentUser } from "@/lib/auth"
import { getBusinessProfile, isBusinessProfileComplete } from "@/models/business-profile"
import { manifest } from "./manifest"
import { TaxInvoiceForm } from "./components/tax-invoice-form"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TaxInvoicePage() {
  const user = await getCurrentUser()
  const businessProfile = await getBusinessProfile(user.id)
  const isComplete = await isBusinessProfileComplete(user.id)

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h2 className="flex flex-row gap-3 md:gap-5">
          <span className="text-3xl font-bold tracking-tight">
            {manifest.name}
          </span>
        </h2>
      </header>

      {!isComplete ? (
        <div className="rounded-lg border bg-card p-6 text-center space-y-3">
          <p className="text-muted-foreground">
            กรุณากรอกข้อมูลธุรกิจก่อนสร้างใบกำกับภาษี
          </p>
          <p className="text-sm text-muted-foreground">
            ข้อมูลบริษัท Tax ID และที่อยู่จำเป็นสำหรับใบกำกับภาษี (ผู้ขาย)
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            ไปหน้าตั้งค่าธุรกิจ
          </Link>
        </div>
      ) : (
        <TaxInvoiceForm businessProfile={businessProfile} />
      )}
    </div>
  )
}
