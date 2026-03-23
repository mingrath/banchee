import { describe, it, expect } from "vitest"
import {
  extractVATFromTotal,
  computeVATOnSubtotal,
  formatSatangToDisplay,
  VAT_RATE,
  WHT_RATES,
  WHT_RATE_OPTIONS,
  WHT_THRESHOLD,
  calculateWHT,
  computeWHTFromTotal,
} from "./tax-calculator"

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

  describe("WHT_RATES constant", () => {
    it("has correct rate for TRANSPORT (1%)", () => {
      expect(WHT_RATES.TRANSPORT).toBe(100)
    })

    it("has correct rate for SERVICE (3%)", () => {
      expect(WHT_RATES.SERVICE).toBe(300)
    })

    it("has correct rate for RENT (5%)", () => {
      expect(WHT_RATES.RENT).toBe(500)
    })

    it("has correct rate for DIVIDEND (10%)", () => {
      expect(WHT_RATES.DIVIDEND).toBe(1000)
    })

    it("has correct rate for ADVERTISING (2%)", () => {
      expect(WHT_RATES.ADVERTISING).toBe(200)
    })
  })

  describe("WHT_RATE_OPTIONS", () => {
    it("has 5 entries", () => {
      expect(WHT_RATE_OPTIONS).toHaveLength(5)
    })

    it("each entry has rate, label, and types", () => {
      for (const option of WHT_RATE_OPTIONS) {
        expect(option).toHaveProperty("rate")
        expect(option).toHaveProperty("label")
        expect(option).toHaveProperty("types")
        expect(typeof option.rate).toBe("number")
        expect(typeof option.label).toBe("string")
        expect(Array.isArray(option.types)).toBe(true)
      }
    })
  })

  describe("WHT_THRESHOLD", () => {
    it("is 100000 satang (1,000 THB)", () => {
      expect(WHT_THRESHOLD).toBe(100000)
    })
  })

  describe("calculateWHT", () => {
    it("calculates 3% WHT on 100,000 THB subtotal (10,000,000 satang)", () => {
      const result = calculateWHT(10000000, 300, 10700000)
      expect(result).toEqual({
        subtotal: 10000000,
        whtAmount: 300000,
        whtRate: 300,
        netPayable: 10400000,
      })
    })

    it("returns zero WHT for zero subtotal", () => {
      const result = calculateWHT(0, 300, 0)
      expect(result).toEqual({
        subtotal: 0,
        whtAmount: 0,
        whtRate: 300,
        netPayable: 0,
      })
    })

    it("returns zero WHT for zero rate", () => {
      const result = calculateWHT(10000000, 0, 10700000)
      expect(result.whtAmount).toBe(0)
      expect(result.netPayable).toBe(10700000)
    })

    it("returns zero WHT when subtotal below threshold (500 THB = 50,000 satang)", () => {
      const result = calculateWHT(50000, 300, 53500)
      expect(result.whtAmount).toBe(0)
      expect(result.netPayable).toBe(53500)
    })

    it("calculates 5% WHT for rent", () => {
      const result = calculateWHT(5000000, 500, 5350000)
      expect(result.whtAmount).toBe(250000)
      expect(result.netPayable).toBe(5100000)
    })

    it("uses integer arithmetic (no floating point drift)", () => {
      const result = calculateWHT(3333333, 300, 3566666)
      expect(Number.isInteger(result.whtAmount)).toBe(true)
      expect(Number.isInteger(result.netPayable)).toBe(true)
    })
  })

  describe("computeWHTFromTotal", () => {
    it("chains extractVATFromTotal then calculateWHT correctly", () => {
      const result = computeWHTFromTotal(10700000, 300)
      expect(result.subtotal).toBe(10000000)
      expect(result.vatAmount).toBe(700000)
      expect(result.whtAmount).toBe(300000)
      expect(result.netPayable).toBe(10400000)
    })

    it("returns zero WHT for zero total", () => {
      const result = computeWHTFromTotal(0, 300)
      expect(result.whtAmount).toBe(0)
      expect(result.subtotal).toBe(0)
    })
  })
})
