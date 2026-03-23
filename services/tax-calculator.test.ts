import { describe, it, expect } from "vitest"
import { extractVATFromTotal, computeVATOnSubtotal, formatSatangToDisplay, VAT_RATE } from "./tax-calculator"

describe("tax-calculator", () => {
  describe("VAT_RATE constant", () => {
    it("should be 700 basis points (7.00%)", () => {
      expect(VAT_RATE).toBe(700)
    })
  })

  describe("extractVATFromTotal", () => {
    it("extracts VAT from 107,000 satang total", () => {
      const result = extractVATFromTotal(107000)
      expect(result).toEqual({ subtotal: 100000, vatAmount: 7000, total: 107000 })
    })

    it("extracts VAT from 10,700 satang total", () => {
      const result = extractVATFromTotal(10700)
      expect(result).toEqual({ subtotal: 10000, vatAmount: 700, total: 10700 })
    })

    it("handles zero total", () => {
      const result = extractVATFromTotal(0)
      expect(result).toEqual({ subtotal: 0, vatAmount: 0, total: 0 })
    })

    it("handles small amounts (1 satang)", () => {
      const result = extractVATFromTotal(107)
      expect(result.subtotal + result.vatAmount).toBe(result.total)
      expect(result.total).toBe(107)
    })

    it("uses integer arithmetic (no floating point drift)", () => {
      // 33,333 satang should not produce fractional results
      const result = extractVATFromTotal(33333)
      expect(Number.isInteger(result.subtotal)).toBe(true)
      expect(Number.isInteger(result.vatAmount)).toBe(true)
      expect(result.subtotal + result.vatAmount).toBe(result.total)
    })

    it("accepts custom VAT rate in basis points", () => {
      // 10% VAT rate = 1000 basis points
      const result = extractVATFromTotal(110000, 1000)
      expect(result).toEqual({ subtotal: 100000, vatAmount: 10000, total: 110000 })
    })
  })

  describe("computeVATOnSubtotal", () => {
    it("computes VAT on 100,000 satang subtotal", () => {
      const result = computeVATOnSubtotal(100000)
      expect(result).toEqual({ subtotal: 100000, vatAmount: 7000, total: 107000 })
    })

    it("handles zero subtotal", () => {
      const result = computeVATOnSubtotal(0)
      expect(result).toEqual({ subtotal: 0, vatAmount: 0, total: 0 })
    })

    it("uses integer arithmetic", () => {
      const result = computeVATOnSubtotal(33333)
      expect(Number.isInteger(result.vatAmount)).toBe(true)
      expect(Number.isInteger(result.total)).toBe(true)
      expect(result.total).toBe(result.subtotal + result.vatAmount)
    })

    it("accepts custom VAT rate", () => {
      const result = computeVATOnSubtotal(100000, 1000)
      expect(result).toEqual({ subtotal: 100000, vatAmount: 10000, total: 110000 })
    })
  })

  describe("formatSatangToDisplay", () => {
    it("converts 107000 satang to 1070.00 baht", () => {
      expect(formatSatangToDisplay(107000)).toBe(1070)
    })

    it("converts 0 satang to 0 baht", () => {
      expect(formatSatangToDisplay(0)).toBe(0)
    })

    it("converts 150 satang to 1.50 baht", () => {
      expect(formatSatangToDisplay(150)).toBe(1.5)
    })
  })
})
