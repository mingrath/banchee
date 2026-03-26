import { Document, Image, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import { registerThaiFonts } from "@/exports/pdf/fonts"
import { thaiPdfStyles } from "@/exports/pdf/thai-pdf-styles"
import { formatThaiDateLong } from "@/services/thai-date"
import type { QuotationData } from "@/services/document-workflow"

// Register THSarabunNew at module top level (Pitfall 6 prevention)
registerThaiFonts()

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
    marginBottom: 8,
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
  colQty: { width: 50, textAlign: "right" },
  colUnit: { width: 50, textAlign: "center" },
  colPrice: { width: 80, textAlign: "right" },
  colDiscount: { width: 70, textAlign: "right" },
  colAmount: { width: 90, textAlign: "right" },
  cellText: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
  },
  summarySection: {
    alignItems: "flex-end",
    marginTop: 12,
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
  separatorLine: {
    width: 250,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    marginTop: 2,
  },
  totalRow: {
    flexDirection: "row",
    width: 250,
    justifyContent: "space-between",
    paddingVertical: 4,
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
  validityNote: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    marginTop: 16,
  },
  noteSection: {
    fontFamily: "THSarabunNew",
    fontSize: 11,
    marginTop: 8,
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

function formatAmount(satang: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(satang / 100)
}

function branchDisplay(branch: string): string {
  return branch === "00000"
    ? "\u0e2a\u0e33\u0e19\u0e31\u0e01\u0e07\u0e32\u0e19\u0e43\u0e2b\u0e0d\u0e48"
    : `\u0e2a\u0e32\u0e02\u0e32\u0e17\u0e35\u0e48 ${parseInt(branch, 10)}`
}

function computeValidityDays(issuedAt: string, validUntil: string): number {
  const issued = new Date(issuedAt)
  const valid = new Date(validUntil)
  const diffMs = valid.getTime() - issued.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function QuotationPDF({ data }: { data: QuotationData }) {
  const {
    seller,
    buyer,
    items,
    subtotal,
    discountAmount,
    includeVat,
    vatAmount,
    total,
    documentNumber,
    issuedAt,
    validUntil,
    note,
  } = data

  const issuedDate = new Date(issuedAt)
  const validUntilDate = new Date(validUntil)
  const thaiIssuedDate = formatThaiDateLong(issuedDate)
  const thaiValidUntilDate = formatThaiDateLong(validUntilDate)
  const validityDays = computeValidityDays(issuedAt, validUntil)

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
            {"\u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35"}: {seller.taxId}
          </Text>
          <Text style={styles.branchBadge}>{branchDisplay(seller.branch)}</Text>
        </View>

        {/* 2. Document title */}
        <View>
          <Text style={styles.mainTitle}>
            {"\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"} / QUOTATION
          </Text>
          <Text style={styles.subTitle}>
            ({"\u0e15\u0e49\u0e19\u0e09\u0e1a\u0e31\u0e1a"})
          </Text>
        </View>

        {/* 3. Document info row */}
        <View style={styles.docInfoRow}>
          <Text style={styles.docInfoText}>
            {"\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48"}: {documentNumber}
          </Text>
          <Text style={styles.docInfoText}>
            {"\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48"}: {thaiIssuedDate}
          </Text>
        </View>

        {/* 4. Horizontal rule */}
        <View style={styles.hr} />

        {/* 5. Party boxes */}
        <View style={styles.partySection}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{"\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"}</Text>
            <Text style={styles.partyDetail}>{seller.name}</Text>
            <Text style={styles.partyDetail}>{seller.address}</Text>
            <Text style={styles.partyDetail}>
              {"\u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35"}: {seller.taxId}
            </Text>
            <Text style={styles.partyBranchBadge}>{branchDisplay(seller.branch)}</Text>
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{"\u0e1c\u0e39\u0e49\u0e23\u0e31\u0e1a\u0e23\u0e32\u0e04\u0e32"}</Text>
            <Text style={styles.partyDetail}>{buyer.name}</Text>
            <Text style={styles.partyDetail}>{buyer.address}</Text>
            <Text style={styles.partyDetail}>
              {"\u0e40\u0e25\u0e02\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e15\u0e31\u0e27\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e35\u0e22\u0e20\u0e32\u0e29\u0e35"}: {buyer.taxId}
            </Text>
            <Text style={styles.partyBranchBadge}>{branchDisplay(buyer.branch)}</Text>
          </View>
        </View>

        {/* 6. Line items table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, styles.colSeq]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>
              {"\u0e23\u0e32\u0e22\u0e25\u0e30\u0e40\u0e2d\u0e35\u0e22\u0e14"}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>
              {"\u0e08\u0e33\u0e19\u0e27\u0e19"}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colUnit]}>
              {"\u0e2b\u0e19\u0e48\u0e27\u0e22"}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>
              {"\u0e23\u0e32\u0e04\u0e32/\u0e2b\u0e19\u0e48\u0e27\u0e22"}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colDiscount]}>
              {"\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14"}
            </Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>
              {"\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19"}
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
              <Text style={[styles.cellText, styles.colPrice]}>
                {formatAmount(item.unitPrice)}
              </Text>
              <Text style={[styles.cellText, styles.colDiscount]}>
                {formatAmount(item.discount)}
              </Text>
              <Text style={[styles.cellText, styles.colAmount]}>
                {formatAmount(item.amount)}
              </Text>
            </View>
          ))}
        </View>

        {/* 7. Totals section */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {"\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e2a\u0e34\u0e19\u0e04\u0e49\u0e32/\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23"}
            </Text>
            <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {"\u0e2a\u0e48\u0e27\u0e19\u0e25\u0e14\u0e23\u0e27\u0e21"}
              </Text>
              <Text style={styles.summaryValue}>{formatAmount(discountAmount)}</Text>
            </View>
          )}
          {includeVat && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {"\u0e20\u0e32\u0e29\u0e35\u0e21\u0e39\u0e25\u0e04\u0e48\u0e32\u0e40\u0e1e\u0e34\u0e48\u0e21"} 7%
              </Text>
              <Text style={styles.summaryValue}>{formatAmount(vatAmount)}</Text>
            </View>
          )}
          <View style={styles.separatorLine} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {"\u0e23\u0e27\u0e21\u0e17\u0e31\u0e49\u0e07\u0e2a\u0e34\u0e49\u0e19"}
            </Text>
            <Text style={styles.totalValue}>
              {formatAmount(total)} {"\u0e1a\u0e32\u0e17"}
            </Text>
          </View>
        </View>

        {/* 8. Validity note */}
        <Text style={styles.validityNote}>
          {"\u0e43\u0e1a\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32\u0e19\u0e35\u0e49\u0e21\u0e35\u0e2d\u0e32\u0e22\u0e38"} {validityDays} {"\u0e27\u0e31\u0e19"} ({"\u0e16\u0e36\u0e07\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48"} {thaiValidUntilDate})
        </Text>

        {/* 9. Note */}
        {note && (
          <Text style={styles.noteSection}>
            {"\u0e2b\u0e21\u0e32\u0e22\u0e40\u0e2b\u0e15\u0e38"}: {note}
          </Text>
        )}

        {/* 10. Signature area */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{"\u0e1c\u0e39\u0e49\u0e40\u0e2a\u0e19\u0e2d\u0e23\u0e32\u0e04\u0e32"}</Text>
            <Text style={styles.signatureDate}>{"\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48"} ____/____/____</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>{"\u0e1c\u0e39\u0e49\u0e2d\u0e19\u0e38\u0e21\u0e31\u0e15\u0e34"}</Text>
            <Text style={styles.signatureDate}>{"\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48"} ____/____/____</Text>
          </View>
        </View>

        {/* 11. Footer */}
        <View style={thaiPdfStyles.footer}>
          <Text>
            {"\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e42\u0e14\u0e22"} BanChee {"\u2014"} {"\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e40\u0e2d\u0e01\u0e2a\u0e32\u0e23\u0e2d\u0e49\u0e32\u0e07\u0e2d\u0e34\u0e07"}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
