/**
 * Thai public holidays for filing deadline calculations.
 *
 * Source: THAI_TAX_REFERENCE.md Section 11 -- Thailand Public Holidays 2026.
 * Buddhist holidays change each year based on lunar calendar.
 * Each year's holiday list should be added manually when available.
 */

/** All 22 Thai public holidays for 2026 (months are 0-indexed: Jan=0, Feb=1, etc.) */
export const THAI_HOLIDAYS_2026: Date[] = [
  new Date(2026, 0, 1),   // New Year's Day
  new Date(2026, 0, 2),   // Extra Holiday
  new Date(2026, 2, 3),   // Makha Bucha Day
  new Date(2026, 3, 6),   // Chakri Day
  new Date(2026, 3, 13),  // Songkran Festival
  new Date(2026, 3, 14),  // Songkran Festival
  new Date(2026, 3, 15),  // Songkran Festival
  new Date(2026, 4, 1),   // Labour Day
  new Date(2026, 4, 4),   // Coronation Day
  new Date(2026, 4, 31),  // Visakha Bucha Day
  new Date(2026, 5, 1),   // Visakha Bucha (substitution)
  new Date(2026, 5, 3),   // Queen Suthida's Birthday
  new Date(2026, 6, 28),  // King's Birthday
  new Date(2026, 6, 29),  // Asanha Bucha Day
  new Date(2026, 6, 30),  // Buddhist Lent Day
  new Date(2026, 7, 12),  // Queen Mother's Birthday
  new Date(2026, 9, 13),  // King Bhumibol Memorial Day
  new Date(2026, 9, 23),  // Chulalongkorn Memorial Day
  new Date(2026, 11, 5),  // Father's Day
  new Date(2026, 11, 7),  // Father's Day (substitution)
  new Date(2026, 11, 10), // Constitution Day
  new Date(2026, 11, 31), // New Year's Eve
]

/**
 * Get holiday list for a given year.
 * Currently only 2026 has data. Returns empty array for other years.
 */
export function getHolidaysForYear(year: number): Date[] {
  switch (year) {
    case 2026:
      return THAI_HOLIDAYS_2026
    default:
      return []
  }
}
