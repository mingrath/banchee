"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormError } from "@/components/forms/error"
import { ContactAutocomplete } from "@/components/contacts/contact-autocomplete"
import { ContactInlineCreate } from "@/components/contacts/contact-inline-create"
import { formatCurrency } from "@/lib/utils"
import { computeVATOnSubtotal } from "@/services/tax-calculator"
import type { BusinessProfile } from "@/models/business-profile"
import type { Contact } from "@/prisma/client"
import { createTaxInvoiceAction, type TaxInvoiceData } from "../actions"
import { InvoicePreview } from "./invoice-preview"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { startTransition, useActionState, useCallback, useEffect, useMemo, useState } from "react"

type LineItem = {
  description: string
  quantity: string
  unitPrice: string // in baht, user-facing
}

const EMPTY_ITEM: LineItem = { description: "", quantity: "1", unitPrice: "" }

export function TaxInvoiceForm({
  businessProfile,
}: {
  businessProfile: BusinessProfile
}) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }])
  const [issuedAt, setIssuedAt] = useState(new Date().toISOString().split("T")[0])
  const [note, setNote] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [invoiceData, setInvoiceData] = useState<TaxInvoiceData | null>(null)

  const [state, formAction, isPending] = useActionState(createTaxInvoiceAction, null)

  // Compute subtotal, VAT, total for display (in satang)
  const { subtotal, vatAmount, total } = useMemo(() => {
    const sub = items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = Math.round((parseFloat(item.unitPrice) || 0) * 100) // baht to satang
      return sum + qty * price
    }, 0)
    return computeVATOnSubtotal(sub)
  }, [items])

  // When creation completes, open preview
  useEffect(() => {
    if (state?.success && state.data) {
      setInvoiceData(state.data)
      setPreviewOpen(true)
    }
  }, [state])

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }, [])

  const handleRemoveItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const handleItemChange = useCallback(
    (index: number, field: keyof LineItem, value: string) => {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      )
    },
    []
  )

  const handleContactCreated = useCallback((contact: Contact) => {
    setSelectedContact(contact)
  }, [])

  const handleSubmit = (formData: FormData) => {
    // Append contactId and issuedAt
    formData.set("contactId", selectedContact?.id ?? "")
    formData.set("issuedAt", issuedAt)
    formData.set("note", note)

    // Append dynamic line items
    for (const item of items) {
      formData.append("item_description", item.description)
      formData.append("item_quantity", item.quantity)
      formData.append("item_unitPrice", item.unitPrice)
    }

    startTransition(() => {
      formAction(formData)
    })
  }

  const handleCreateNew = useCallback(() => {
    setSelectedContact(null)
    setItems([{ ...EMPTY_ITEM }])
    setIssuedAt(new Date().toISOString().split("T")[0])
    setNote("")
    setInvoiceData(null)
    setPreviewOpen(false)
  }, [])

  return (
    <>
      <form action={handleSubmit} className="space-y-6">
        {/* Buyer Section (Field 3) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ข้อมูลผู้ซื้อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>เลือกผู้ซื้อ / ผู้ติดต่อ</Label>
              <ContactAutocomplete
                onSelect={setSelectedContact}
                onCreateNew={() => setCreateDialogOpen(true)}
                selectedContact={selectedContact}
              />
            </div>

            {selectedContact && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
                <p>
                  <span className="font-medium">ชื่อ:</span> {selectedContact.name}
                </p>
                <p>
                  <span className="font-medium">Tax ID:</span> {selectedContact.taxId}
                </p>
                <p>
                  <span className="font-medium">สาขา:</span>{" "}
                  {selectedContact.branch === "00000"
                    ? "สำนักงานใหญ่"
                    : `สาขาที่ ${parseInt(selectedContact.branch, 10)}`}
                </p>
                <p>
                  <span className="font-medium">ที่อยู่:</span> {selectedContact.address}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Items Section (Field 5) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">รายการสินค้า / บริการ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Table Header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_40px] gap-2 text-sm font-medium text-muted-foreground px-1">
              <span>รายละเอียด</span>
              <span className="text-right">จำนวน</span>
              <span className="text-right">ราคาต่อหน่วย (บาท)</span>
              <span />
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_40px] gap-2 items-start"
              >
                <Input
                  placeholder="รายละเอียดสินค้า / บริการ"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, "description", e.target.value)}
                />
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="จำนวน"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                  className="text-right"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="ราคา (บาท)"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, "unitPrice", e.target.value)}
                  className="text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index)}
                  disabled={items.length <= 1}
                  className="shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            ))}

            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-1" />
              เพิ่มรายการ
            </Button>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">มูลค่าสินค้า/บริการ</span>
                <span className="tabular-nums">{formatCurrency(subtotal, "THB")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT 7%</span>
                <span className="tabular-nums">{formatCurrency(vatAmount, "THB")}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>รวมทั้งสิ้น</span>
                <span className="tabular-nums">{formatCurrency(total, "THB")}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Section (Field 7) + Note */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ข้อมูลเพิ่มเติม</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issuedAt">วันที่ออกใบกำกับภาษี</Label>
                <Input
                  id="issuedAt"
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>เลขที่เอกสาร</Label>
                <Input
                  value="จะถูกสร้างอัตโนมัติ"
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">หมายเหตุ (ไม่บังคับ)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="หมายเหตุเพิ่มเติม"
                className="h-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Seller Info (Read-only, Field 2) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ข้อมูลผู้ขาย (จากข้อมูลธุรกิจ)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
              <p>
                <span className="font-medium">ชื่อ:</span> {businessProfile.companyName}
              </p>
              <p>
                <span className="font-medium">Tax ID:</span> {businessProfile.taxId}
              </p>
              <p>
                <span className="font-medium">สาขา:</span>{" "}
                {businessProfile.branch === "00000"
                  ? "สำนักงานใหญ่"
                  : `สาขาที่ ${parseInt(businessProfile.branch, 10)}`}
              </p>
              <p>
                <span className="font-medium">ที่อยู่:</span> {businessProfile.address}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {state?.error && <FormError>{state.error}</FormError>}

        {/* Submit */}
        <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              กำลังสร้างใบกำกับภาษี...
            </>
          ) : (
            "สร้างใบกำกับภาษี"
          )}
        </Button>
      </form>

      {/* Contact Inline Create Dialog */}
      <ContactInlineCreate
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleContactCreated}
      />

      {/* Invoice Preview Dialog */}
      {invoiceData && (
        <InvoicePreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          invoiceData={invoiceData}
          onCreateNew={handleCreateNew}
        />
      )}
    </>
  )
}
