/**
 * Filing deadline computation for Thai tax forms.
 *
 * Computes paper and e-filing deadlines for PP30, PND3, PND53.
 * Adjusts deadlines to next business day when they fall on weekends or Thai public holidays.
 *
 * Source: THAI_TAX_REFERENCE.md Section 10 -- Filing Deadline Calendar.
 */

import { isWeekend, addDays, isSameDay } from "date-fns"
import { getHolidaysForYear } from "./thai-holidays"

export type FilingDeadline = {
  formType: "PP30" | "PND3" | "PND53"
  formLabel: string
  taxMonth: number
  taxYear: number
  paperDeadline: Date
  eFilingDeadline: Date
  adjustedDeadline: Date
}

/**
 * Advance a date to the next business day if it falls on a weekend or holiday.
 * Loops until the date is neither a weekend day nor a public holiday.
 */
export function getNextBusinessDay(date: Date, holidays: Date[]): Date {
  let current = new Date(date)
  while (isWeekend(current) || holidays.some((h) => isSameDay(h, current))) {
    current = addDays(current, 1)
  }
  return current
}

/**
 * Get filing deadlines for a given tax month.
 *
 * Deadlines fall in the NEXT month after the tax period:
 * - PND3:  paper 7th, e-filing 15th of next month (WHT - individuals)
 * - PND53: paper 7th, e-filing 15th of next month (WHT - companies)
 * - PP30:  paper 15th, e-filing 23rd of next month (VAT return)
 *
 * adjustedDeadline = getNextBusinessDay(eFilingDeadline, holidays)
 */
export function getDeadlinesForMonth(taxMonth: number, taxYear: number): FilingDeadline[] {
  // Deadlines are in the NEXT month
  const nextMonth = taxMonth === 12 ? 0 : taxMonth
  const nextYear = taxMonth === 12 ? taxYear + 1 : taxYear

  // Get holidays for the deadline year
  const holidays = getHolidaysForYear(nextYear)

  // PND3 -- WHT for individuals
  const pnd3Paper = new Date(nextYear, nextMonth, 7)
  const pnd3EFiling = new Date(nextYear, nextMonth, 15)

  // PND53 -- WHT for companies
  const pnd53Paper = new Date(nextYear, nextMonth, 7)
  const pnd53EFiling = new Date(nextYear, nextMonth, 15)

  // PP30 -- VAT return
  const pp30Paper = new Date(nextYear, nextMonth, 15)
  const pp30EFiling = new Date(nextYear, nextMonth, 23)

  return [
    {
      formType: "PND3",
      formLabel: "ภ.ง.ด.3 (WHT บุคคลธรรมดา)",
      taxMonth,
      taxYear,
      paperDeadline: pnd3Paper,
      eFilingDeadline: pnd3EFiling,
      adjustedDeadline: getNextBusinessDay(pnd3EFiling, holidays),
    },
    {
      formType: "PND53",
      formLabel: "ภ.ง.ด.53 (WHT นิติบุคคล)",
      taxMonth,
      taxYear,
      paperDeadline: pnd53Paper,
      eFilingDeadline: pnd53EFiling,
      adjustedDeadline: getNextBusinessDay(pnd53EFiling, holidays),
    },
    {
      formType: "PP30",
      formLabel: "ภ.พ.30 (ภาษีมูลค่าเพิ่ม)",
      taxMonth,
      taxYear,
      paperDeadline: pp30Paper,
      eFilingDeadline: pp30EFiling,
      adjustedDeadline: getNextBusinessDay(pp30EFiling, holidays),
    },
  ]
}
