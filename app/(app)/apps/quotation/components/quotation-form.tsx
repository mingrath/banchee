"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FormError } from "@/components/forms/error"
import { ContactAutocomplete } from "@/components/contacts/contact-autocomplete"
import { ContactInlineCreate } from "@/components/contacts/contact-inline-create"
import { formatCurrency } from "@/lib/utils"
import { computeVATOnSubtotal } from "@/services/tax-calculator"
import type { BusinessProfile } from "@/models/business-profile"
import type { Contact } from "@/prisma/client"
import { createQuotationAction } from "../actions"
import type { QuotationData } from "@/services/document-workflow"
import { QuotationPreview } from "./quotation-preview"
import { Loader2, Plus, Trash2 } from "lucide-react"
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type LineItem = {
  description: string
  quantity: string
  unit: string
  unitPrice: string
  discount: string
}

const EMPTY_ITEM: LineItem = {
  description: "",
  quantity: "1",
  unit: "\u0e0a\u0e34\u0e49\u0e19",
  unitPrice: "",
  discount: "0",
}

export function QuotationForm({
  contacts,
  userId,
  profile,
}: {
  contacts: Contact[]
  userId: string
  profile: BusinessProfile
}) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_ITEM }])
  const [includeVat, setIncludeVat] = useState(false)
  const [overallDiscount, setOverallDiscount] = useState("0")
  const [issuedAt, setIssuedAt] = useState(
    new Date().toISOString().split("T")[0]
  )
  const [validityDays, setValidityDays] = useState("30")
  const [paymentTerms, setPaymentTerms] = useState("")
  const [note, setNote] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const [quotationData, setQuotationData] = useState<QuotationData | null>(null)

  const descriptionRefs = useRef<(HTMLInputElement | null)[]>([])

  const [state, formAction, isPending] = useActionState(
    createQuotationAction,
    null
  )

  // Compute totals in satang via useMemo
  const totals = useMemo(() => {
    const itemAmounts = items.map((item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unitPrice) || 0
      const disc = parseFloat(item.discount) || 0
      return Math.round(qty * price * 100) - Math.round(disc * 100)
    })
    const subtotal = itemAmounts.reduce((sum, a) => sum + a, 0)
    const discountSatang = Math.round((parseFloat(overallDiscount) || 0) * 100)
    const afterDiscount = subtotal - discountSatang
    const vatResult = includeVat
      ? computeVATOnSubtotal(afterDiscount)
      : { vatAmount: 0 }
    const total = afterDiscount + vatResult.vatAmount
    return {
      subtotal,
      discountSatang,
      afterDiscount,
      vatAmount: vatResult.vatAmount,
      total,
    }
  }, [items, overallDiscount, includeVat])

  // On successful result, show preview
  useEffect(() => {
    if (state?.success && state.data) {
      setQuotationData(state.data)
      setShowPreview(true)
    }
  }, [state])

  const addItem = useCallback(() => {
    setItems((prev) => {
      const next = [...prev, { ...EMPTY_ITEM }]
      // Focus the new description input after render
      requestAnimationFrame(() => {
        descriptionRefs.current[next.length - 1]?.focus()
      })
      return next
    })
  }, [])

  const removeItem = useCallback((index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const updateItem = useCallback(
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
    // Append scalar fields
    formData.set("contactId", selectedContact?.id ?? "")
    formData.set("issuedAt", issuedAt)
    formData.set("validityDays", validityDays)
    formData.set("paymentTerms", paymentTerms)
    formData.set("includeVat", includeVat ? "true" : "false")
    formData.set("overallDiscount", overallDiscount)
    formData.set("note", note)

    // Append dynamic line items
    items.forEach((item) => {
      formData.append("item_description", item.description)
      formData.append("item_quantity", item.quantity)
      formData.append("item_unit", item.unit)
      formData.append("item_unitPrice", item.unitPrice)
      formData.append("item_discount", item.discount)
    })

    startTransition(() => {
      formAction(formData)
    })
  }

  const handleCreateNew = useCallback(() => {
    setSelectedContact(null)
    setItems([{ ...EMPTY_ITEM }])
    setIncludeVat(false)
    setOverallDiscount("0")
    setIssuedAt(new Date().toISOString().split("T")[0])
    setValidityDays("30")
    setPaymentTerms("")
    setNote("")
    setQuotationData(null)
    setShowPreview(false)
  }, [])

  return (
    <>
      <form action={handleSubmit} className="space-y-6">
        {/* Card 1: Buyer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {"\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1c\u0e39\u0e49\u0e0b\u0e37\u0e49\u0e2d"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>
                {"\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e1c\u0e39\u0e49\u0e0b\u0e37\u0e49\u0e2d"} / {"\u0e1c\u0e39\u0e49\u0e15\u0e34\u0e14\u0e15\u0e48\u0e2d"}
              </Label>
              <ContactAutocomplete
                onSelect={setSelectedContact}
                onCreateNew={() => setCreateDialogOpen(true)}
                selectedContact={selectedContact}
              />
            </div>

            {selectedContact && (
              <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
                <p>
                  <span className="font-medium">
                    {"\u0e0a\u0e37\u0e48\u0e2d"}:
                  </span>{" "}
                  {selectedContact.name}
                </p>
                <p>
                  <span className="font-medium">Tax ID:</span>{" "}
                  {selectedContact.taxId}
                </p>
                <p>
                  <span className="font-medium">
                    {"\u0e2a\u0e32\u0e02\u0e32"}:
                  </span>{" "}
                  {selectedContact.branch === "00000"
                    ? "\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e0d\u0e48"
                    : `\u0e2a\u0e32\u0e02\u0e32\u0e17\u0e35\u0e48 ${parseInt(selectedContact.branch, 10)}`}
                </p>
                <p>
                  <span className="font-medium">
                    {"\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48"}:
                  </span>{" "}
                  {selectedContact.address}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Line Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {"\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32"} / {"\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Grid Header (desktop only) */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_80px_80px_100px_100px_100px_40px] gap-2 text-sm font-medium text-muted-foreground px-1">
              <span>{"\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14"}</span>
              <span className="text-right">{"\u0e08\u0e33\u0e19\u0e27\u0e19"}</span>
              <span className="text-right">{"\u0e2b\u0e19\u0e48\u0e27\u0e22"}</span>
              <span className="text-right">
                {"\u0e23\u0e32\u0e04\u0e32/\u0e2b\u0e19\u0e48\u0e27\u0e22"} ({"\u0e1a\u0e32\u0e17"})
              </span>
              <span className="text-right">
                {"\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14"} ({"\u0e1a\u0e32\u0e17"})
              </span>
              <span className="text-right">{"\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19"}</span>
              <span />
            </div>

            {/* Line Item Rows */}
            {items.map((item, index) => {
              const qty = parseFloat(item.quantity) || 0
              const price = parseFloat(item.unitPrice) || 0
              const disc = parseFloat(item.discount) || 0
              const itemAmount =
                Math.round(qty * price * 100) - Math.round(disc * 100)

              return (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_80px_80px_100px_100px_100px_40px] gap-2 items-start"
                >
                  <Input
                    ref={(el) => {
                      descriptionRefs.current[index] = el
                    }}
                    placeholder={"\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32 / \u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23"}
                    value={item.description}
                    onChange={(e) =>
                      updateItem(index, "description", e.target.value)
                    }
                  />
                  <Input
                    type="number"
                    min="0.01"
                    step="1"
                    placeholder={"\u0e08\u0e33\u0e19\u0e27\u0e19"}
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(index, "quantity", e.target.value)
                    }
                    className="text-right"
                  />
                  <Input
                    placeholder={"\u0e2b\u0e19\u0e48\u0e27\u0e22"}
                    value={item.unit}
                    onChange={(e) => updateItem(index, "unit", e.target.value)}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={"\u0e23\u0e32\u0e04\u0e32 (\u0e1a\u0e32\u0e17)"}
                    value={item.unitPrice}
                    onChange={(e) =>
                      updateItem(index, "unitPrice", e.target.value)
                    }
                    className="text-right"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={item.discount}
                    onChange={(e) =>
                      updateItem(index, "discount", e.target.value)
                    }
                    className="text-right"
                  />
                  <Input
                    value={formatCurrency(itemAmount, "THB")}
                    disabled
                    className="text-right bg-muted"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={"\u0e25\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23"}
                          disabled={items.length <= 1}
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {"\u0e25\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
            >
              <Plus className="h-4 w-4 mr-1" />
              {"\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23"}
            </Button>

            {/* Totals Section */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {"\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32/\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23"}
                </span>
                <span className="tabular-nums">
                  {formatCurrency(totals.subtotal, "THB")}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {"\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14\u0e23\u0e27\u0e21"} ({"\u0e1a\u0e32\u0e17"})
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(e.target.value)}
                  className="w-32 text-right"
                />
              </div>

              <div className="flex justify-between items-center text-sm">
                <Label
                  htmlFor="vatToggle"
                  className="text-muted-foreground cursor-pointer"
                >
                  {"\u0e23\u0e27\u0e21"} VAT 7%
                </Label>
                <Switch
                  id="vatToggle"
                  checked={includeVat}
                  onCheckedChange={setIncludeVat}
                />
              </div>

              {includeVat && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {"\u0e20\u0e32\u0e29\u0e35\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e40\u0e1e\u0e34\u0e48\u0e21"} 7%
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(totals.vatAmount, "THB")}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold">
                <span>{"\u0e23\u0e27\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2a\u0e34\u0e49\u0e19"}</span>
                <span className="tabular-nums">
                  {formatCurrency(totals.total, "THB")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Document Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {"\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issuedAt">
                  {"\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e2d\u0e2d\u0e01\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23"}
                </Label>
                <Input
                  id="issuedAt"
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  {"\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23"}
                </Label>
                <Input
                  value={"\u0e08\u0e30\u0e16\u0e39\u0e01\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e2d\u0e31\u0e15\u0e42\u0e19\u0e21\u0e31\u0e15\u0e34"}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validityDays">
                  {"\u0e23\u0e30\u0e22\u0e30\u0e40\u0e27\u0e25\u0e32\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"} ({"\u0e27\u0e31\u0e19"})
                </Label>
                <Input
                  id="validityDays"
                  type="number"
                  min="1"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">
                  {"\u0e40\u0e07\u0e37\u0e48\u0e2d\u0e19\u0e44\u0e02\u0e01\u0e32\u0e23\u0e0a\u0e33\u0e23\u0e30\u0e40\u0e07\u0e34\u0e19"}
                </Label>
                <Textarea
                  id="paymentTerms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder={"\u0e40\u0e0a\u0e48\u0e19 \u0e0a\u0e33\u0e23\u0e30\u0e20\u0e32\u0e22\u0e43\u0e19 30 \u0e27\u0e31\u0e19\u0e2b\u0e25\u0e31\u0e07\u0e2a\u0e48\u0e07\u0e21\u0e2d\u0e1a"}
                  className="h-20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">
                {"\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38"} ({"\u0e44\u0e21\u0e48\u0e1a\u0e31\u0e07\u0e04\u0e31\u0e1a"})
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={"\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38\u0e40\u0e1e\u0e34\u0e48\u0e21\u0e40\u0e15\u0e34\u0e21"}
                className="h-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Seller Info (read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {"\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e1c\u0e39\u0e49\u0e02\u0e32\u0e22"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted/50 p-3 space-y-1 text-sm">
              <p>
                <span className="font-medium">
                  {"\u0e0a\u0e37\u0e48\u0e2d"}:
                </span>{" "}
                {profile.companyName}
              </p>
              <p>
                <span className="font-medium">Tax ID:</span> {profile.taxId}
              </p>
              <p>
                <span className="font-medium">
                  {"\u0e2a\u0e32\u0e02\u0e32"}:
                </span>{" "}
                {profile.branch === "00000"
                  ? "\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e0d\u0e48"
                  : `\u0e2a\u0e32\u0e02\u0e32\u0e17\u0e35\u0e48 ${parseInt(profile.branch, 10)}`}
              </p>
              <p>
                <span className="font-medium">
                  {"\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48"}:
                </span>{" "}
                {profile.address}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {state?.error && <FormError>{state.error}</FormError>}

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {"\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"}...
            </>
          ) : (
            "\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"
          )}
        </Button>
      </form>

      {/* Contact Inline Create Dialog */}
      <ContactInlineCreate
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleContactCreated}
      />

      {/* Quotation Preview Dialog */}
      {quotationData && (
        <QuotationPreview
          data={quotationData}
          open={showPreview}
          onOpenChange={setShowPreview}
          onCreateNew={handleCreateNew}
        />
      )}
    </>
  )
}
