import DashboardDropZoneWidget from "@/components/dashboard/drop-zone-widget"
import { FilingDeadlineCard } from "@/components/dashboard/filing-deadline-card"
import { StatsWidget } from "@/components/dashboard/stats-widget"
import DashboardUnsortedWidget from "@/components/dashboard/unsorted-widget"
import { VATExpiryWarnings } from "@/components/dashboard/vat-expiry-warnings"
import { VATSummaryCard } from "@/components/dashboard/vat-summary-card"
import { VATThresholdAlert } from "@/components/dashboard/vat-threshold-alert"
import { WelcomeWidget } from "@/components/dashboard/welcome-widget"
import { WHTSummaryCard } from "@/components/dashboard/wht-summary-card"
import { Separator } from "@/components/ui/separator"
import { getCurrentUser } from "@/lib/auth"
import config from "@/lib/config"
import { getBusinessProfile } from "@/models/business-profile"
import { getUnsortedFiles } from "@/models/files"
import { getSettings } from "@/models/settings"
import { getExpiringInvoices, getRevenueYTD, getUpcomingDeadlines, getVATSummary, getWHTSummary } from "@/models/stats"
import { TransactionFilters } from "@/models/transactions"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dashboard",
  description: config.app.description,
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<TransactionFilters> }) {
  const filters = await searchParams
  const user = await getCurrentUser()
  const unsortedFiles = await getUnsortedFiles(user.id)
  const settings = await getSettings(user.id)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [profile, vatSummary, expiringInvoices, revenueYTD, whtSummary, upcomingDeadlines] = await Promise.all([
    getBusinessProfile(user.id),
    getVATSummary(user.id, filters),
    getExpiringInvoices(user.id),
    getRevenueYTD(user.id),
    getWHTSummary(user.id, currentMonth, currentYear),
    getUpcomingDeadlines(user.id),
  ])

  // 144000000 satang = 1,440,000 THB = 80% of 1.8M threshold
  const THRESHOLD_80_PERCENT = 144000000

  return (
    <div className="flex flex-col gap-5 p-5 w-full max-w-7xl self-center">
      <div className="flex flex-col sm:flex-row gap-5 items-stretch h-full">
        <DashboardDropZoneWidget />

        <DashboardUnsortedWidget files={unsortedFiles} />
      </div>

      {settings.is_welcome_message_hidden !== "true" && <WelcomeWidget />}

      <Separator />

      <StatsWidget filters={filters} />

      {profile.vatRegistered && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-bold mt-4 mb-4">
              {"\u0e20\u0e32\u0e29\u0e35\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e40\u0e1e\u0e34\u0e48\u0e21 (VAT)"}
            </h2>
            {vatSummary.outputCount === 0 && vatSummary.inputCount === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-base font-medium mb-1">
                  {"\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e20\u0e32\u0e29\u0e35"}
                </p>
                <p className="text-sm">
                  {"\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e14\u0e49\u0e27\u0e22\u0e01\u0e32\u0e23\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e43\u0e1a\u0e01\u0e33\u0e01\u0e31\u0e1a\u0e20\u0e32\u0e29\u0e35\u0e2b\u0e23\u0e37\u0e2d\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08"}
                </p>
              </div>
            ) : (
              <>
                <VATSummaryCard vatSummary={vatSummary} defaultCurrency="THB" />
                {expiringInvoices.length > 0 && <VATExpiryWarnings invoices={expiringInvoices} />}
              </>
            )}
          </div>
        </>
      )}

      {!profile.vatRegistered && revenueYTD >= THRESHOLD_80_PERCENT && (
        <VATThresholdAlert revenueYTD={revenueYTD} />
      )}

      {profile && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-bold mt-4 mb-4">
              {"\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e22\u0e37\u0e48\u0e19\u0e20\u0e32\u0e29\u0e35"}
            </h2>
            <FilingDeadlineCard deadlines={upcomingDeadlines} defaultCurrency="THB" />
          </div>
        </>
      )}

      {profile && (
        <>
          <Separator />
          <div>
            <h2 className="text-lg font-bold mt-4 mb-4">
              {"\u0e20\u0e32\u0e29\u0e35\u0e2b\u0e31\u0e01 \u0e13 \u0e17\u0e35\u0e48\u0e08\u0e48\u0e32\u0e22\u0e40\u0e14\u0e37\u0e2d\u0e19\u0e19\u0e35\u0e49"}
            </h2>
            {whtSummary.totalWithheld === 0 && whtSummary.pnd3Count === 0 && whtSummary.pnd53Count === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-base font-medium mb-1">
                  {"\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e20\u0e32\u0e29\u0e35\u0e2b\u0e31\u0e01 \u0e13 \u0e17\u0e35\u0e48\u0e08\u0e48\u0e32\u0e22"}
                </p>
                <p className="text-sm">
                  {"\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e49\u0e19\u0e14\u0e49\u0e27\u0e22\u0e01\u0e32\u0e23\u0e2d\u0e31\u0e1b\u0e42\u0e2b\u0e25\u0e14\u0e43\u0e1a\u0e40\u0e2a\u0e23\u0e47\u0e08\u0e23\u0e31\u0e1a\u0e17\u0e35\u0e48\u0e21\u0e35\u0e01\u0e32\u0e23\u0e2b\u0e31\u0e01\u0e20\u0e32\u0e29\u0e35"}
                </p>
              </div>
            ) : (
              <WHTSummaryCard whtSummary={whtSummary} defaultCurrency="THB" />
            )}
          </div>
        </>
      )}
    </div>
  )
}
