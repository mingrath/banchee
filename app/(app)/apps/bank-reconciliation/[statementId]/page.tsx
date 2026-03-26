import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getCurrentUser } from "@/lib/auth"
import {
  getBankStatementById,
  getResolvedEntryCount,
  getEntriesWithTransactions,
} from "@/models/bank-statements"
import { StatusBadge } from "@/app/(app)/apps/documents/components/status-badge"
import { ReconciliationProgress } from "../components/reconciliation-progress"
import { MatchReviewTable } from "../components/match-review-table"
import { ReconciliationComplete } from "./reconciliation-complete"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

const RECONCILIATION_STATUS_MAP: Record<
  string,
  { label: string; color: string }
> = {
  imported: {
    label: "นำเข้าแล้ว",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  in_progress: {
    label: "กำลังดำเนินการ",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
  },
  reconciled: {
    label: "กระทบยอดเสร็จ",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
}

export default async function BankReconciliationReviewPage({
  params,
}: {
  params: Promise<{ statementId: string }>
}) {
  const { statementId } = await params
  const user = await getCurrentUser()
  const statement = await getBankStatementById(user.id, statementId)

  if (!statement) {
    notFound()
  }

  const { resolved, total } = await getResolvedEntryCount(statementId)
  const entriesWithTx = await getEntriesWithTransactions(statementId)
  const isComplete = total > 0 && resolved === total

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
            กระทบยอด: {statement.filename}
          </h2>
          <StatusBadge
            status={statement.status}
            statusMap={RECONCILIATION_STATUS_MAP}
          />
        </div>
        <Button variant="outline" asChild>
          <Link href="/apps/bank-reconciliation">
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับรายการ
          </Link>
        </Button>
      </header>

      <div className="mb-6">
        <ReconciliationProgress resolved={resolved} total={total} />
      </div>

      <MatchReviewTable entries={entriesWithTx} />

      {isComplete && <ReconciliationComplete />}
    </div>
  )
}
