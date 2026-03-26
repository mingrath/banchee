"use client"

import Link from "next/link"
import { formatCurrency } from "@/lib/utils"
import { formatThaiDate } from "@/services/thai-date"
import { QUOTATION_STATUSES } from "@/services/document-workflow"
import { StatusBadge } from "./status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { useState } from "react"
import type { Document } from "@/prisma/client"

export function QuotationList({ documents }: { documents: Document[] }) {
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredDocs = documents.filter((doc) => {
    if (statusFilter === "all") return true
    return doc.status === statusFilter
  })

  // Determine effective status (lazy expiration for sent quotations)
  function getEffectiveStatus(doc: Document): string {
    if (
      doc.status === "sent" &&
      doc.validUntil &&
      new Date(doc.validUntil) < new Date()
    ) {
      return "expired"
    }
    return doc.status
  }

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {"\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14"}
            </SelectItem>
            {Object.entries(QUOTATION_STATUSES).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredDocs.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-center space-y-2">
          <p className="font-medium">
            {"\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"}
          </p>
          <p className="text-sm text-muted-foreground">
            {"\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32\u0e41\u0e23\u0e01\u0e40\u0e1e\u0e37\u0e48\u0e2d\u0e40\u0e23\u0e34\u0e48\u0e21\u0e15\u0e34\u0e14\u0e15\u0e32\u0e21\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e18\u0e38\u0e23\u0e01\u0e34\u0e08"}
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{"\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48"}</TableHead>
                <TableHead>{"\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48"}</TableHead>
                <TableHead>{"\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32"}</TableHead>
                <TableHead className="text-right">
                  {"\u0e22\u0e2d\u0e14\u0e23\u0e27\u0e21"}
                </TableHead>
                <TableHead>{"\u0e2a\u0e16\u0e32\u0e19\u0e30"}</TableHead>
                <TableHead>{"\u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38"}</TableHead>
                <TableHead>{"\u0e01\u0e32\u0e23\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => {
                const effectiveStatus = getEffectiveStatus(doc)
                const buyerData = doc.buyerData as { name?: string } | null
                const buyerName = buyerData?.name ?? "\u2014"

                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <Link
                        href={`/apps/quotation/${doc.id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {doc.documentNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {doc.issuedAt
                        ? formatThaiDate(new Date(doc.issuedAt))
                        : "\u2014"}
                    </TableCell>
                    <TableCell>{buyerName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(doc.total, "THB")}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={effectiveStatus} />
                    </TableCell>
                    <TableCell>
                      {doc.validUntil ? (
                        <span
                          className={
                            effectiveStatus === "expired"
                              ? "text-orange-600 dark:text-orange-400 font-medium"
                              : ""
                          }
                        >
                          {formatThaiDate(new Date(doc.validUntil))}
                          {effectiveStatus === "expired" &&
                            ` (\u0e2b\u0e21\u0e14\u0e2d\u0e32\u0e22\u0e38)`}
                        </span>
                      ) : (
                        "\u2014"
                      )}
                    </TableCell>
                    <TableCell>
                      <Link href={`/apps/quotation/${doc.id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
