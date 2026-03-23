import { StyleSheet } from "@react-pdf/renderer"

export const thaiPdfStyles = StyleSheet.create({
  page: {
    fontFamily: "THSarabunNew",
    fontSize: 12,
    paddingTop: 30,
    paddingBottom: 30,
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  heading: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  body: {
    fontSize: 12,
    fontWeight: "normal",
    lineHeight: 1.5,
  },
  small: {
    fontSize: 10,
    fontWeight: "bold",
  },
  tableHeader: {
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    padding: 4,
  },
  tableCell: {
    fontSize: 11,
    padding: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  amountCell: {
    fontSize: 11,
    padding: 4,
    textAlign: "right",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    fontSize: 9,
    color: "#6b7280",
    textAlign: "center",
  },
})
