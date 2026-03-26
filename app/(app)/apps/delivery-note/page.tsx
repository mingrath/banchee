import { getCurrentUser } from "@/lib/auth"
import { listDocuments } from "@/models/documents"
import { formatThaiDate } from "@/services/thai-date"
import { StatusBadge } from "../quotation/components/status-badge"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function DeliveryNotePage() {
  const user = await getCurrentUser()
  const deliveryNotes = await listDocuments(user.id, {
    documentType: "DELIVERY_NOTE",
  })

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-8">
        <h2 className="text-3xl font-bold tracking-tight">
          ใบส่งของ
        </h2>
      </header>

      {deliveryNotes.length > 0 ? (
        <div className="space-y-2">
          {deliveryNotes.map((note) => (
            <Link
              key={note.id}
              href={`/apps/delivery-note/${note.id}`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-primary">
                  {note.documentNumber}
                </span>
                <span className="text-sm text-muted-foreground">
                  {note.issuedAt
                    ? formatThaiDate(new Date(note.issuedAt))
                    : ""}
                </span>
              </div>
              <StatusBadge status={note.status} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6 text-center space-y-3">
          <p className="text-muted-foreground">
            ยังไม่มีใบส่งของ
          </p>
          <p className="text-sm text-muted-foreground">
            สร้างใบส่งของจากหน้าใบเสนอราคาหรือใบแจ้งหนี้
          </p>
        </div>
      )}
    </div>
  )
}
