import { describe, it, expect } from "vitest"
import { getDeadlinesForMonth, getNextBusinessDay } from "./filing-deadlines"

describe("filing-deadlines", () => {
  describe("getNextBusinessDay", () => {
    it("returns same day if already a business day", () => {
      // Feb 23, 2026 is a Monday
      const date = new Date(2026, 1, 23)
      const result = getNextBusinessDay(date, [])
      expect(result.getDate()).toBe(23)
    })

    it("skips weekends (Saturday -> Monday)", () => {
      // Feb 14, 2026 is a Saturday
      const date = new Date(2026, 1, 14)
      const result = getNextBusinessDay(date, [])
      expect(result.getDate()).toBe(16) // Monday
    })

    it("skips Sunday to Monday", () => {
      // Feb 15, 2026 is a Sunday
      const date = new Date(2026, 1, 15)
      const result = getNextBusinessDay(date, [])
      expect(result.getDate()).toBe(16) // Monday
    })

    it("skips holidays", () => {
      const holiday = new Date(2026, 1, 16) // Make Monday a holiday
      const date = new Date(2026, 1, 15) // Sunday
      const result = getNextBusinessDay(date, [holiday])
      expect(result.getDate()).toBe(17) // Tuesday
    })

    it("skips consecutive holidays correctly (Songkran Apr 13-15)", () => {
      const holidays = [
        new Date(2026, 3, 13),
        new Date(2026, 3, 14),
        new Date(2026, 3, 15),
      ]
      const date = new Date(2026, 3, 13) // Apr 13 Monday
      const result = getNextBusinessDay(date, holidays)
      expect(result.getDate()).toBe(16) // Apr 16 Thursday
    })
  })

  describe("getDeadlinesForMonth", () => {
    it("returns 3 deadlines for January 2026", () => {
      const deadlines = getDeadlinesForMonth(1, 2026)
      expect(deadlines).toHaveLength(3)
    })

    it("returns PND3, PND53, and PP30 form types", () => {
      const deadlines = getDeadlinesForMonth(1, 2026)
      const formTypes = deadlines.map((d) => d.formType).sort()
      expect(formTypes).toEqual(["PND3", "PND53", "PP30"])
    })

    it("PND3 for Jan 2026: e-filing deadline is Feb 15, adjusted to Feb 16 (Sunday -> Monday)", () => {
      const deadlines = getDeadlinesForMonth(1, 2026)
      const pnd3 = deadlines.find((d) => d.formType === "PND3")!
      expect(pnd3.eFilingDeadline.getMonth()).toBe(1) // February
      expect(pnd3.eFilingDeadline.getDate()).toBe(15)
      expect(pnd3.adjustedDeadline.getMonth()).toBe(1)
      expect(pnd3.adjustedDeadline.getDate()).toBe(16) // Monday
    })

    it("PP30 for Jan 2026: e-filing deadline is Feb 23, no adjustment needed (Monday)", () => {
      const deadlines = getDeadlinesForMonth(1, 2026)
      const pp30 = deadlines.find((d) => d.formType === "PP30")!
      expect(pp30.eFilingDeadline.getMonth()).toBe(1)
      expect(pp30.eFilingDeadline.getDate()).toBe(23)
      expect(pp30.adjustedDeadline.getDate()).toBe(23) // Already Monday
    })

    it("handles December tax month (deadlines in January of next year)", () => {
      const deadlines = getDeadlinesForMonth(12, 2025)
      const pnd3 = deadlines.find((d) => d.formType === "PND3")!
      expect(pnd3.eFilingDeadline.getFullYear()).toBe(2026)
      expect(pnd3.eFilingDeadline.getMonth()).toBe(0) // January
    })

    it("includes correct taxMonth and taxYear", () => {
      const deadlines = getDeadlinesForMonth(3, 2026)
      for (const d of deadlines) {
        expect(d.taxMonth).toBe(3)
        expect(d.taxYear).toBe(2026)
      }
    })

    it("includes Thai form labels", () => {
      const deadlines = getDeadlinesForMonth(1, 2026)
      const pp30 = deadlines.find((d) => d.formType === "PP30")!
      expect(pp30.formLabel).toContain("30")
      const pnd3 = deadlines.find((d) => d.formType === "PND3")!
      expect(pnd3.formLabel).toContain("3")
    })
  })
})
