import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { registerThaiFonts } from "@/exports/pdf/fonts"
import { thaiPdfStyles } from "@/exports/pdf/thai-pdf-styles"
import { formatThaiDateLong } from "@/services/thai-date"

// Register THSarabunNew at module top level (Pitfall 6 prevention)
registerThaiFonts()

export type DeliveryNoteData = {
  id: string
  documentNumber: string
  status: string
  issuedAt: string
  seller: {
    name: string
    taxId: string
    branch: string
    address: string
    logo?: string
  }
  buyer: {
    name: string
    taxId: string
    branch: string
    address: string
  }
  items: {
    description: string
    quantity: number
    unit: string
  }[]
  note?: string
}

const styles = StyleSheet.create({
  ...thaiPdfStyles,
  headerSection: {
    marginBottom: 12,
    textAlign: "center",
    alignItems: "center",
  },
  companyName: {
    fontFamily: "THSarabunNew",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
  },
  companyDetail: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 1,
  },
  branchBadge: {
    fontFamily: "THSarabunNew",
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 2,
  },
  mainTitle: {
    fontFamily: "THSarabunNew",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
    marginTop: 8,
  },
  subTitle: {
    fontFamily: "THSarabunNew",
    fontSize: 14,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 8,
  },
  docInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  docInfoText: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    fontWeight: "bold",
  },
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    marginVertical: 8,
  },
  partySection: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 12,
  },
  partyBox: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: "#d1d5db",
    borderRadius: 4,
    padding: 8,
  },
  partyLabel: {
    fontFamily: "THSarabunNew",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#374151",
  },
  partyDetail: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    marginBottom: 2,
  },
  partyBranchBadge: {
    fontFamily: "THSarabunNew",
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  itemsTable: {
    marginBottom: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#1f2937",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    fontFamily: "THSarabunNew",
    fontSize: 10,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: "#f9fafb",
  },
  colSeq: { width: 30, textAlign: "center" },
  colDesc: { flex: 1 },
  colQty: { width: 60, textAlign: "right" },
  colUnit: { width: 60, textAlign: "center" },
  cellText: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
  },
  noteSection: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    marginTop: 16,
  },
  signatureArea: {
    flexDirection: "row",
    marginTop: 40,
    justifyContent: "space-around",
  },
  signatureBlock: {
    alignItems: "center",
  },
  signatureLine: {
    width: 100,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
    marginBottom: 4,
  },
  signatureLabel: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    marginBottom: 2,
  },
  signatureDate: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    color: "#6b7280",
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: 4,
  },
})

function branchDisplay(branch: string): string {
  return branch === "00000"
    ? "สำนักงานใหญ่"
    : `สาขาที่ ${parseInt(branch, 10)}`
}

export function DeliveryNotePDF({ data }: { data: DeliveryNoteData }) {
  const {
    seller,
    buyer,
    items,
    documentNumber,
    issuedAt,
    note,
  } = data

  const issuedDate = new Date(issuedAt)
  const thaiIssuedDate = formatThaiDateLong(issuedDate)

  const BASE_URL = process.env.BASE_URL ?? "http://localhost:7331"

  return (
    <Document>
      <Page size="A4" style={thaiPdfStyles.page}>
        {/* 1. Company header */}
        <View style={styles.headerSection}>
          {seller.logo && (
            <Image
              src={`${BASE_URL}/files/static/${seller.logo}`}
              style={styles.logo}
            />
          )}
          <Text style={styles.companyName}>{seller.name}</Text>
          <Text style={styles.companyDetail}>{seller.address}</Text>
          <Text style={styles.companyDetail}>
            เลขประจำตัวผู้เสียภาษี: {seller.taxId}
          </Text>
          <Text style={styles.branchBadge}>{branchDisplay(seller.branch)}</Text>
        </View>

        {/* 2. Document title */}
        <View>
          <Text style={styles.mainTitle}>
            ใบส่งของ / DELIVERY NOTE
          </Text>
          <Text style={styles.subTitle}>
            (ต้นฉบับ)
          </Text>
        </View>

        {/* 3. Document info rows */}
        <View style={styles.docInfoRow}>
          <Text style={styles.docInfoText}>
            เลขที่: {documentNumber}
          </Text>
          <Text style={styles.docInfoText}>
            วันที่: {thaiIssuedDate}
          </Text>
        </View>

        {/* 4. Horizontal rule */}
        <View style={styles.hr} />

        {/* 5. Party boxes */}
        <View style={styles.partySection}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>ผู้ส่งสินค้า (Sender)</Text>
            <Text style={styles.partyDetail}>{seller.name}</Text>
            <Text style={styles.partyDetail}>{seller.address}</Text>
            <Text style={styles.partyDetail}>
              เลขประจำตัวผู้เสียภาษี: {seller.taxId}
            </Text>
            <Text style={styles.partyBranchBadge}>{branchDisplay(seller.branch)}</Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>ผู้รับสินค้า (Receiver)</Text>
            <Text style={styles.partyDetail}>{buyer.name}</Text>
            <Text style={styles.partyDetail}>{buyer.address}</Text>
            <Text style={styles.partyDetail}>
              เลขประจำตัวผู้เสียภาษี: {buyer.taxId}
            </Text>
            <Text style={styles.partyBranchBadge}>{branchDisplay(buyer.branch)}</Text>
          </View>
        </View>

        {/* 6. Line items table -- NO financial columns per D-18 */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.colSeq]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>
              รายละเอียด
            </Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>
              จำนวน
            </Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>
              หน่วย
            </Text>
          </View>
          {items.map((item, index) => (
            <View
              key={index}
              style={index % 2 === 1 ? styles.tableRowAlt : styles.tableRow}
            >
              <Text style={[styles.cellText, styles.colSeq]}>{index + 1}</Text>
              <Text style={[styles.cellText, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellText, styles.colUnit]}>{item.unit}</Text>
            </View>
          ))}
        </View>

        {/* NO totals section -- delivery notes have no financial data per D-18 */}

        {/* 7. Note */}
        {note && (
          <Text style={styles.noteSection}>
            หมายเหตุ: {note}
          </Text>
        )}

        {/* 8. Signature area */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>ผู้ส่งสินค้า</Text>
            <Text style={styles.signatureDate}>วันที่ ____/____/____</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>ผู้รับสินค้า</Text>
            <Text style={styles.signatureDate}>วันที่ ____/____/____</Text>
          </View>
        </View>

        {/* 9. Footer */}
        <View style={thaiPdfStyles.footer}>
          <Text>
            สร้างโดย BanChee {"\u2014"} เอกสารนี้เป็นเอกสารอ้างอิง
          </Text>
        </View>
      </Page>
    </Document>
  )
}
