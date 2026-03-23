import { describe, it, expect } from "vitest"
import { formatThaiDate, formatThaiDateLong, formatThaiMonth, toBuddhistYear } from "./thai-date"

describe("thai-date", () => {
  describe("toBuddhistYear", () => {
    it("converts 2026 to 2569", () => {
      expect(toBuddhistYear(2026)).toBe(2569)
    })

    it("converts 2000 to 2543", () => {
      expect(toBuddhistYear(2000)).toBe(2543)
    })

    it("converts 1970 to 2513", () => {
      expect(toBuddhistYear(1970)).toBe(2513)
    })
  })

  describe("formatThaiDate", () => {
    it("formats March 23, 2026 with Buddhist Era year 2569", () => {
      const date = new Date("2026-03-23")
      const result = formatThaiDate(date)
      expect(result).toContain("2569")
    })

    it("contains Thai month abbreviation for March", () => {
      const date = new Date("2026-03-23")
      const result = formatThaiDate(date)
      // Thai short month for March is "มี.ค."
      expect(result).toMatch(/มี\.ค\./)
    })

    it("contains day number", () => {
      const date = new Date("2026-03-23")
      const result = formatThaiDate(date)
      expect(result).toContain("23")
    })
  })

  describe("formatThaiDateLong", () => {
    it("contains full Thai month name for January", () => {
      const date = new Date("2026-01-15")
      const result = formatThaiDateLong(date)
      expect(result).toContain("มกราคม")
    })

    it("contains Buddhist Era year", () => {
      const date = new Date("2026-01-15")
      const result = formatThaiDateLong(date)
      expect(result).toContain("2569")
    })
  })

  describe("formatThaiMonth", () => {
    it("formats month and year for March 2026", () => {
      const date = new Date("2026-03-15")
      const result = formatThaiMonth(date)
      expect(result).toContain("มีนาคม")
      expect(result).toContain("2569")
    })
  })
})
