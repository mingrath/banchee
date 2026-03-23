"use client"

import { saveBusinessProfileAction, resetBusinessProfileAction } from "@/app/(app)/settings/business-profile-actions"
import { FormError } from "@/components/forms/error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { BusinessProfile } from "@/models/business-profile"
import { CircleCheckBig, Loader2, RotateCcw } from "lucide-react"
import { startTransition, useActionState, useState } from "react"

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
]

export function BusinessProfileForm({
  businessProfile,
}: {
  businessProfile: BusinessProfile
}) {
  const [saveState, saveAction, isSaving] = useActionState(saveBusinessProfileAction, null)
  const [resetState, resetAction, isResetting] = useActionState(resetBusinessProfileAction, null)
  const [vatRegistered, setVatRegistered] = useState(businessProfile.vatRegistered)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const handleReset = () => {
    startTransition(() => {
      resetAction(new FormData())
    })
    setResetDialogOpen(false)
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">ข้อมูลธุรกิจ</h3>
      <form action={saveAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">ชื่อบริษัท</Label>
          <Input
            id="companyName"
            name="companyName"
            defaultValue={businessProfile.companyName}
            placeholder="บริษัท ตัวอย่าง จำกัด"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="taxId">เลขประจำตัวผู้เสียภาษี</Label>
          <Input
            id="taxId"
            name="taxId"
            defaultValue={businessProfile.taxId}
            placeholder="1234567890123"
            maxLength={13}
            pattern="\d{13}"
            title="เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch">สาขา</Label>
          <Select name="branch" defaultValue={businessProfile.branch || "00000"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="00000">สำนักงานใหญ่</SelectItem>
              <SelectItem value="00001">สาขาที่ 1</SelectItem>
              <SelectItem value="00002">สาขาที่ 2</SelectItem>
              <SelectItem value="00003">สาขาที่ 3</SelectItem>
              <SelectItem value="00004">สาขาที่ 4</SelectItem>
              <SelectItem value="00005">สาขาที่ 5</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">ที่อยู่</Label>
          <Textarea
            id="address"
            name="address"
            defaultValue={businessProfile.address}
            placeholder="ที่อยู่สำนักงาน"
            className="h-20"
          />
        </div>

        <div className="flex items-center gap-3">
          <Label htmlFor="vatRegistered" className="cursor-pointer">
            จดทะเบียน VAT
          </Label>
          <input
            type="checkbox"
            id="vatRegistered"
            name="vatRegistered"
            defaultChecked={businessProfile.vatRegistered}
            onChange={(e) => setVatRegistered(e.target.checked)}
            className="h-5 w-5 rounded border-gray-300"
          />
        </div>

        {vatRegistered && (
          <div className="space-y-2">
            <Label htmlFor="vatRegDate">วันที่จดทะเบียน VAT</Label>
            <Input
              id="vatRegDate"
              name="vatRegDate"
              type="date"
              defaultValue={businessProfile.vatRegDate || ""}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="paidUpCapital">ทุนจดทะเบียนชำระแล้ว (บาท)</Label>
          <Input
            id="paidUpCapital"
            name="paidUpCapital"
            type="number"
            step="1"
            min="0"
            defaultValue={businessProfile.paidUpCapital > 0 ? businessProfile.paidUpCapital / 100 : ""}
            placeholder="5,000,000"
          />
          <p className="text-xs text-muted-foreground">
            ใช้สำหรับคำนวณสิทธิ์ SME (ไม่เกิน 5 ล้านบาท) และเพดานค่ารับรอง
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fiscalYearStart">รอบบัญชี (เดือนเริ่มต้น)</Label>
          <Select name="fiscalYearStart" defaultValue={String(businessProfile.fiscalYearStart)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THAI_MONTHS.map((name, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-row items-center gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                กำลังบันทึก...
              </>
            ) : (
              "บันทึกข้อมูลธุรกิจ"
            )}
          </Button>
          {saveState?.success && (
            <p className="text-green-500 flex flex-row items-center gap-2 text-sm">
              <CircleCheckBig className="h-4 w-4" />
              บันทึกสำเร็จ
            </p>
          )}
        </div>

        {saveState?.error && <FormError>{saveState.error}</FormError>}
      </form>

      {/* Reset Business Profile */}
      <div className="mt-6 pt-4 border-t">
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <RotateCcw className="h-4 w-4 mr-1" />
              รีเซ็ตข้อมูลธุรกิจ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>รีเซ็ตข้อมูลธุรกิจ</DialogTitle>
              <DialogDescription>
                ต้องการรีเซ็ตข้อมูลธุรกิจ? การดำเนินการนี้จะลบข้อมูลบริษัท Tax ID
                และการตั้งค่า VAT ทั้งหมด
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
                {isResetting ? "กำลังรีเซ็ต..." : "ยืนยัน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {resetState?.success && (
          <p className="text-green-500 text-sm mt-2">รีเซ็ตข้อมูลธุรกิจสำเร็จ</p>
        )}
      </div>
    </div>
  )
}
