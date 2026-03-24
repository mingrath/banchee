import ExportDataClient from "./components/export-data-client"

export const dynamic = "force-dynamic"

export default async function ExportDataPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">ส่งออกข้อมูล</h1>
        <p className="text-muted-foreground mt-1">
          ดาวน์โหลดข้อมูลทางบัญชีในรูปแบบ Excel หรือ CSV สำหรับส่งต่อนักบัญชีหรือนำเข้าโปรแกรมบัญชี
        </p>
      </div>

      <ExportDataClient />
    </div>
  )
}
