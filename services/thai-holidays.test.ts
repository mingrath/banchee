import { describe, it, expect } from "vitest"
import { THAI_HOLIDAYS_2026, getHolidaysForYear } from "./thai-holidays"

describe("thai-holidays", () => {
  describe("THAI_HOLIDAYS_2026", () => {
    it("has 22 entries", () => {
      expect(THAI_HOLIDAYS_2026).toHaveLength(22)
    })

    it("includes New Year's Day (Jan 1)", () => {
      const newYear = THAI_HOLIDAYS_2026.find(
        (d) => d.getMonth() === 0 && d.getDate() === 1
      )
      expect(newYear).toBeDefined()
    })

    it("includes Songkran (Apr 13-15)", () => {
      const songkran = THAI_HOLIDAYS_2026.filter(
        (d) => d.getMonth() === 3 && d.getDate() >= 13 && d.getDate() <= 15
      )
      expect(songkran).toHaveLength(3)
    })

    it("includes King's Birthday (Jul 28)", () => {
      const kingBday = THAI_HOLIDAYS_2026.find(
        (d) => d.getMonth() === 6 && d.getDate() === 28
      )
      expect(kingBday).toBeDefined()
    })

    it("includes New Year's Eve (Dec 31)", () => {
      const nye = THAI_HOLIDAYS_2026.find(
        (d) => d.getMonth() === 11 && d.getDate() === 31
      )
      expect(nye).toBeDefined()
    })

    it("all dates are in 2026", () => {
      for (const d of THAI_HOLIDAYS_2026) {
        expect(d.getFullYear()).toBe(2026)
      }
    })
  })

  describe("getHolidaysForYear", () => {
    it("returns THAI_HOLIDAYS_2026 for year 2026", () => {
      const holidays = getHolidaysForYear(2026)
      expect(holidays).toHaveLength(22)
    })

    it("returns empty array for unsupported year", () => {
      const holidays = getHolidaysForYear(2025)
      expect(holidays).toEqual([])
    })
  })
})
