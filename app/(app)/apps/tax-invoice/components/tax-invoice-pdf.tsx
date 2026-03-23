import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { registerThaiFonts } from "@/exports/pdf/fonts"
import { thaiPdfStyles } from "@/exports/pdf/thai-pdf-styles"
import { formatThaiDateLong, toBuddhistYear } from "@/services/thai-date"
import { formatSatangToDisplay } from "@/services/tax-calculator"
import type { TaxInvoiceData } from "../actions"

// Ensure fonts are registered
registerThaiFonts()

const styles = StyleSheet.create({
  ...thaiPdfStyles,
  headerSection: {
    marginBottom: 12,
    textAlign: "center",
  },
  mainTitle: {
    fontFamily: "THSarabunNew",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 2,
  },
  subTitle: {
    fontFamily: "THSarabunNew",
    fontSize: 14,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 8,
  },
  docInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    paddingBottom: 8,
  },
  partySection: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 20,
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
  branchBadge: {
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
  colSeq: { width: 30, textAlign: "center" },
  colDesc: { flex: 1 },
  colQty: { width: 60, textAlign: "right" },
  colPrice: { width: 80, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  cellText: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
  },
  summarySection: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
    width: 250,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  summaryLabel: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
  },
  summaryValue: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    textAlign: "right",
  },
  totalRow: {
    flexDirection: "row",
    width: 250,
    justifyContent: "space-between",
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    marginTop: 2,
  },
  totalLabel: {
    fontFamily: "THSarabunNew",
    fontSize: 13,
    fontWeight: "bold",
  },
  totalValue: {
    fontFamily: "THSarabunNew",
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "right",
  },
  noteSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  noteLabel: {
    fontFamily: "THSarabunNew",
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  noteText: {
    fontFamily: "THSarabunNew",
    fontSize: 10,
  },
})

function formatAmount(satang: number): string {
  const baht = formatSatangToDisplay(satang)
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(baht)
}

function branchDisplay(branch: string): string {
  return branch === "00000"
    ? "\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e0d\u0e48"
    : `\u0e2a\u0e32\u0e02\u0e32\u0e17\u0e35\u0e48 ${parseInt(branch, 10)}`
}

export function TaxInvoicePDF({
  invoiceData,
}: {
  invoiceData: TaxInvoiceData
}) {
  const { seller, buyer, items, subtotal, vatAmount, total, documentNumber, issuedAt, note } = invoiceData
  const issuedDate = new Date(issuedAt)
  const thaiDate = formatThaiDateLong(issuedDate)

  return (
    <Document>
      <Page size="A4" style={thaiPdfStyles.page}>
        {/* Field 1: "ใบกำกับภาษี / TAX INVOICE" header */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>
            {"\u0e43\u0e1a\u0e01\u0e33\u0e01\u0e31\u0e1a\u0e20\u0e32\u0e29\u0e35"} / TAX INVOICE
          </Text>
          <Text style={styles.subTitle}>
            ({"\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07"})
          </Text>
        </View>

        {/* Field 4 + Field 7: Document number and date */}
        <View style={styles.docInfo}>
          <View>
            <Text style={[styles.cellText, { fontWeight: "bold" }]}>
              {"\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48"}: {documentNumber}
            </Text>
          </View>
          <View>
            <Text style={[styles.cellText, { fontWeight: "bold" }]}>
              {"\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48"}: {thaiDate}
            </Text>
          </View>
        </View>

        {/* Field 2 + Field 3 + Field 8: Seller and Buyer info side by side */}
        <View style={styles.partySection}>
          {/* Field 2: Seller */}
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{"\u0e1c\u0e39\u0e49\u0e02\u0e32\u0e22"} (Seller)</Text>
            <Text style={styles.partyDetail}>{seller.name}</Text>
            <Text style={styles.partyDetail}>{seller.address}</Text>
            <Text style={styles.partyDetail}>
              {"\u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35"}: {seller.taxId}
            </Text>
            {/* Field 8.1: Branch designation */}
            <Text style={styles.branchBadge}>{branchDisplay(seller.branch)}</Text>
          </View>

          {/* Field 3: Buyer */}
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{"\u0e1c\u0e39\u0e49\u0e0b\u0e37\u0e49\u0e2d"} (Buyer)</Text>
            <Text style={styles.partyDetail}>{buyer.name}</Text>
            <Text style={styles.partyDetail}>{buyer.address}</Text>
            {/* Field 8.2: Buyer Tax ID */}
            <Text style={styles.partyDetail}>
              {"\u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35"}: {buyer.taxId}
            </Text>
            <Text style={styles.branchBadge}>{branchDisplay(buyer.branch)}</Text>
          </View>
        </View>

        {/* Field 5: Items table */}
        <View style={styles.itemsTable}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.colSeq]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>
              {"\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14"}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>
              {"\u0e08\u0e33\u0e19\u0e27\u0e19"}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>
              {"\u0e23\u0e32\u0e04\u0e32/\u0e2b\u0e19\u0e48\u0e27\u0e22"}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>
              {"\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19"}
            </Text>
          </View>

          {/* Table Body */}
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.cellText, styles.colSeq]}>{index + 1}</Text>
              <Text style={[styles.cellText, styles.colDesc]}>{item.description}</Text>
              <Text style={[styles.cellText, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cellText, styles.colPrice]}>
                {formatAmount(item.unitPrice)}
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {formatAmount(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* Field 6: VAT amount (separated from subtotal) + totals */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {"\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32/\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23"}
            </Text>
            <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {"\u0e20\u0e32\u0e29\u0e35\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e40\u0e1e\u0e34\u0e48\u0e21"} (7%)
            </Text>
            <Text style={styles.summaryValue}>{formatAmount(vatAmount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {"\u0e23\u0e27\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2a\u0e34\u0e49\u0e19"}
            </Text>
            <Text style={styles.totalValue}>{formatAmount(total)} {"\u0e1a\u0e32\u0e17"}</Text>
          </View>
        </View>

        {/* Note */}
        {note && (
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>{"\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38"}:</Text>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={thaiPdfStyles.footer}>
          <Text>
            {"\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e42\u0e14\u0e22"} BanChee -- {"\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07\u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19"}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
