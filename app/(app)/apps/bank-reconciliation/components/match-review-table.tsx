"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Check,
  X,
  Plus,
  SkipForward,
  Undo2,
  ChevronDown,
  Loader2,
} from "lucide-react"
import { formatThaiDate } from "@/services/thai-date"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  confirmMatchAction,
  rejectMatchAction,
  createTransactionFromEntryAction,
  skipEntryAction,
  undoMatchAction,
} from "@/app/(app)/apps/bank-reconciliation/actions"
import { toast } from "sonner"
import type { BankEntryWithTransaction } from "@/models/bank-statements"

// ─── Match Status Badge Colors ────────────────────────────────

const MATCH_STATUS_MAP: Record<string, { label: string; className: string }> = {
  unmatched: {
    label: "ยังไม่จับคู่",
    className: "bg-secondary text-secondary-foreground",
  },
  suggested: {
    label: "แนะนำ",
    className: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  },
  confirmed: {
    label: "ยืนยันแล้ว",
    className: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  },
  created: {
    label: "สร้างรายการแล้ว",
    className: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  },
  skipped: {
    label: "ข้าม",
    className: "bg-muted text-muted-foreground",
  },
}

// ─── Amount Formatting ────────────────────────────────────────

function formatAmount(satang: number): string {
  return (satang / 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ─── Match Score Badge ────────────────────────────────────────

function MatchScoreBadge({ score }: { score: number }) {
  let className: string
  if (score >= 80) {
    className = "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
  } else if (score >= 60) {
    className = "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
  } else {
    className = "bg-secondary text-secondary-foreground"
  }

  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      {score}%
    </Badge>
  )
}

// ─── Row Visual Treatment ─────────────────────────────────────

function getRowClassName(matchStatus: string): string {
  switch (matchStatus) {
    case "confirmed":
    case "created":
      return "bg-green-50/30 dark:bg-green-900/10"
    case "skipped":
      return "bg-muted/30 text-muted-foreground"
    default:
      return ""
  }
}

// ─── Single Entry Row ─────────────────────────────────────────

function EntryRow({ entry }: { entry: BankEntryWithTransaction }) {
  const router = useRouter()
  const [isConfirming, startConfirm] = useTransition()
  const [isRejecting, startReject] = useTransition()
  const [isCreating, startCreate] = useTransition()
  const [isSkipping, startSkip] = useTransition()
  const [isUndoing, startUndo] = useTransition()

  const isDeposit = (entry.deposit ?? 0) > 0
  const amount = isDeposit ? (entry.deposit ?? 0) : (entry.withdrawal ?? 0)
  const amountPrefix = isDeposit ? "+" : "-"
  const amountColorClass = isDeposit
    ? "text-green-700 dark:text-green-400"
    : "text-red-700 dark:text-red-400"

  const matchStatusInfo = MATCH_STATUS_MAP[entry.matchStatus]
  const matchReasons = entry.matchReasons as unknown[] | null

  function handleConfirm() {
    if (!entry.transactionId) return
    startConfirm(async () => {
      const result = await confirmMatchAction(entry.id, entry.transactionId!)
      if (!result.success) {
        toast.error(result.error ?? "จับคู่รายการไม่สำเร็จ -- กรุณาลองใหม่")
      }
      router.refresh()
    })
  }

  function handleReject() {
    startReject(async () => {
      const result = await rejectMatchAction(entry.id)
      if (!result.success) {
        toast.error(result.error ?? "จับคู่รายการไม่สำเร็จ -- กรุณาลองใหม่")
      }
      router.refresh()
    })
  }

  function handleCreate() {
    startCreate(async () => {
      const result = await createTransactionFromEntryAction(entry.id)
      if (!result.success) {
        toast.error(result.error ?? "จับคู่รายการไม่สำเร็จ -- กรุณาลองใหม่")
      }
      router.refresh()
    })
  }

  function handleSkip() {
    startSkip(async () => {
      const result = await skipEntryAction(entry.id)
      if (!result.success) {
        toast.error(result.error ?? "จับคู่รายการไม่สำเร็จ -- กรุณาลองใหม่")
      }
      router.refresh()
    })
  }

  function handleUndo() {
    startUndo(async () => {
      const result = await undoMatchAction(entry.id)
      if (!result.success) {
        toast.error(result.error ?? "จับคู่รายการไม่สำเร็จ -- กรุณาลองใหม่")
      }
      router.refresh()
    })
  }

  function handleSwitchMatch(alternativeTransactionId: string) {
    startConfirm(async () => {
      // Reject current, then confirm alternative
      await rejectMatchAction(entry.id)
      const result = await confirmMatchAction(entry.id, alternativeTransactionId)
      if (!result.success) {
        toast.error(result.error ?? "จับคู่รายการไม่สำเร็จ -- กรุณาลองใหม่")
      }
      router.refresh()
    })
  }

  return (
    <TableRow className={getRowClassName(entry.matchStatus)}>
      {/* Left column: Bank entry */}
      <TableCell className="align-top">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm">
              {formatThaiDate(new Date(entry.date))}
            </span>
            <span className="text-sm font-medium">{entry.description}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium tabular-nums ${amountColorClass}`}>
              {amountPrefix}{formatAmount(amount)}
            </span>
            {entry.matchScore !== null && entry.matchStatus === "suggested" && (
              <MatchScoreBadge score={entry.matchScore} />
            )}
            {matchStatusInfo && (
              <Badge
                variant="outline"
                className={`text-xs ${matchStatusInfo.className}`}
              >
                {matchStatusInfo.label}
              </Badge>
            )}
          </div>

          {/* Alternatives via Collapsible */}
          {Array.isArray(matchReasons) &&
            matchReasons.length > 1 &&
            entry.matchStatus === "suggested" && (
              <Collapsible>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronDown className="h-3 w-3" />
                  ดูตัวเลือกอื่น
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-1">
                  {(matchReasons as Array<{ transactionId: string; name: string; score: number }>)
                    .slice(1)
                    .map((alt) => (
                      <div
                        key={alt.transactionId}
                        className="flex items-center justify-between text-xs p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span>{alt.name}</span>
                          <MatchScoreBadge score={alt.score} />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleSwitchMatch(alt.transactionId)}
                          disabled={isConfirming}
                        >
                          สลับ
                        </Button>
                      </div>
                    ))}
                </CollapsibleContent>
              </Collapsible>
            )}
        </div>
      </TableCell>

      {/* Right column: Matched transaction or actions */}
      <TableCell className="align-top">
        <div className="space-y-2">
          {/* Suggested match */}
          {entry.matchStatus === "suggested" && entry.matchedTransaction && (
            <>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {entry.matchedTransaction.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.matchedTransaction.issuedAt
                    ? formatThaiDate(new Date(entry.matchedTransaction.issuedAt))
                    : ""}
                  {" "}
                  {entry.matchedTransaction.total !== null
                    ? `฿${formatAmount(entry.matchedTransaction.total)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleConfirm}
                        disabled={isConfirming}
                      >
                        {isConfirming ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ยืนยันการจับคู่</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleReject}
                        disabled={isRejecting}
                      >
                        {isRejecting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ปฏิเสธการจับคู่</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </>
          )}

          {/* Unmatched - no suggestion */}
          {entry.matchStatus === "unmatched" && (
            <>
              <p className="text-sm text-muted-foreground">
                ไม่พบรายการที่ตรงกัน
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleCreate}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-3 w-3" />
                  )}
                  สร้างรายการ
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSkip}
                  disabled={isSkipping}
                >
                  {isSkipping ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <SkipForward className="mr-1 h-3 w-3" />
                  )}
                  ข้าม
                </Button>
              </div>
            </>
          )}

          {/* Confirmed */}
          {entry.matchStatus === "confirmed" && entry.matchedTransaction && (
            <>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {entry.matchedTransaction.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {entry.matchedTransaction.issuedAt
                    ? formatThaiDate(new Date(entry.matchedTransaction.issuedAt))
                    : ""}
                  {" "}
                  {entry.matchedTransaction.total !== null
                    ? `฿${formatAmount(entry.matchedTransaction.total)}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                >
                  ยืนยันแล้ว
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleUndo}
                        disabled={isUndoing}
                      >
                        {isUndoing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Undo2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>ยกเลิก</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </>
          )}

          {/* Created */}
          {entry.matchStatus === "created" && (
            <Badge
              variant="outline"
              className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
            >
              สร้างรายการแล้ว
            </Badge>
          )}

          {/* Skipped */}
          {entry.matchStatus === "skipped" && (
            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
              ข้าม
            </Badge>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}

// ─── MatchReviewTable Component ───────────────────────────────

export function MatchReviewTable({
  entries,
}: {
  entries: BankEntryWithTransaction[]
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2">
              รายการธนาคาร (Bank Entry)
            </TableHead>
            <TableHead className="w-1/2">
              รายการ BanChee (Matched Tx)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                ไม่มีรายการ
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <EntryRow key={entry.id} entry={entry} />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
