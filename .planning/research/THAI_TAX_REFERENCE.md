# Thai Tax Technical Reference — BanChee Implementation Guide

**Compiled:** 2026-03-23
**Sources:** Thai Revenue Department (rd.go.th), Tilleke & Gibbins, KPMG, PwC, Forvis Mazars, FlowAccount, VBA Partners, Reliance Consulting, Acclime Thailand
**Purpose:** Definitive reference for implementing all Thai tax calculations, forms, and validations in BanChee

---

## 1. Tax Invoice (ใบกำกับภาษี) — Section 86/4 Required Fields

A full-format tax invoice (ใบกำกับภาษีเต็มรูป) MUST contain these fields per Section 86/4:

| # | Field (Thai) | Field (English) | Notes |
|---|---|---|---|
| 1 | คำว่า "ใบกำกับภาษี" | The words "Tax Invoice" | Must be prominent/visible |
| 2 | ชื่อ ที่อยู่ เลขประจำตัวผู้เสียภาษีอากรของผู้ขาย | Seller's name, address, 13-digit Tax ID | Must match VAT registration |
| 3 | ชื่อ ที่อยู่ ของผู้ซื้อ | Buyer's name and address | Required for full-format |
| 4 | หมายเลขลำดับใบกำกับภาษี | Tax invoice serial number | Sequential numbering required |
| 5 | ชื่อ ชนิด ประเภท ปริมาณ มูลค่า | Description, type, quantity, value of goods/services | Must be specific |
| 6 | จำนวนภาษีมูลค่าเพิ่ม | VAT amount | Must be SEPARATED from product value, shown clearly |
| 7 | วัน เดือน ปี ที่ออก | Date of issuance | Can be Thai or Gregorian |
| 8 | ข้อความอื่นที่อธิบดีกำหนด | Other items prescribed by Director-General | See below |

### Director-General Prescribed Items (Field 8):
- **8.1**: คำว่า "สำนักงานใหญ่" หรือ "สาขาที่..." — "Head Office" or "Branch No." of the seller
- **8.2**: เลขประจำตัวผู้เสียภาษีอากรของผู้ซื้อ — Buyer's Tax ID (especially for VAT-registered buyers)

### Language Requirements:
- Must be in **Thai language**, **Thai currency (Baht)**, and **Thai or Arabic numerals**
- Foreign language/currency requires Director-General approval

### AI Validation Checklist for BanChee:
```
[ ] "ใบกำกับภาษี" text present and prominent
[ ] Seller name matches a business entity
[ ] Seller Tax ID present (13 digits)
[ ] Seller address present
[ ] "สำนักงานใหญ่" or "สาขาที่..." present
[ ] Buyer name present
[ ] Buyer address present
[ ] Sequential invoice number present
[ ] Item descriptions with quantities and values
[ ] VAT amount separated from base value
[ ] Date of issuance present
[ ] Buyer Tax ID present (for B2B transactions)
```

---

## 2. WHT Rate Table — Complete Reference

### Payments to Thai Companies/Partnerships (PND53):

| Service Type | Thai Name | WHT Rate | Section |
|---|---|---|---|
| Interest (bank to company) | ดอกเบี้ย | 1% | 40(4)(a) |
| Dividends | เงินปันผล | 10% | 40(4)(b) |
| Rent (property) | ค่าเช่า | 5% | 40(5) |
| Rental service fee | ค่าเช่าบริการ | 3% | — |
| Professional/service fees | ค่าบริการ/ค่าจ้างทำของ | 3% | 40(2), 40(6)-(8) |
| Advertising fees | ค่าโฆษณา | 2% | — |
| Transportation (non-public) | ค่าขนส่ง | 1% | — |
| Non-life insurance premiums | เบี้ยประกันวินาศภัย | 1% | — |
| Royalties | ค่าลิขสิทธิ์ | 3% | 40(3) |
| Prizes/awards | รางวัล | 5% | — |
| Sales promotion discounts | ส่วนลดส่งเสริมการขาย | 3% | — |

### Payments to Individuals (PND3):

| Service Type | WHT Rate | Notes |
|---|---|---|
| Service fees | 3% | Professional, consulting, etc. |
| Rent | 5% | Property, equipment |
| Transportation | 1% | Excluding public transport |
| Advertising | 2% | — |
| Prizes/awards | 5% | — |
| Commission/brokerage | 3% | Agents, brokers |

### Critical Rules:
- **WHT is calculated on the NET amount BEFORE VAT** (not the total)
- **Threshold:** WHT applies when payment ≥ 1,000 THB (or cumulative ≥ 1,000 THB under long-term contract)
- **Exempt:** Purchases of goods (not services), payments to government, BOI-promoted companies, public transport
- **Water/electricity payments:** NOT subject to WHT
- **Filing deadline:** 7th of following month (paper) / 15th of following month (e-filing)

### WHT Calculation Formula:
```
Invoice total (VAT-inclusive) = 107,000
Net amount (before VAT) = 107,000 / 1.07 = 100,000
VAT = 7,000
WHT (3% on net) = 100,000 × 0.03 = 3,000
Amount paid to vendor = 107,000 - 3,000 = 104,000
```

---

## 3. VAT Calculation Formulas

### Standard VAT Rate: 7% (through September 2026 per Royal Decree No. 799)

### VAT-Exclusive (adding VAT to base):
```
Base amount = 100,000
VAT = 100,000 × 0.07 = 7,000
Total = 107,000
```

### VAT-Inclusive (extracting VAT from total — the /107 method):
```
Total (VAT-inclusive) = 107,000
Base amount = 107,000 × 100 / 107 = 100,000
VAT amount = 107,000 × 7 / 107 = 7,000
```

### VAT Liability Formula:
```
Monthly VAT liability = Output Tax (ภาษีขาย) - Input Tax (ภาษีซื้อ)
If positive → Tax payable to Revenue Dept
If negative → Tax credit (carry forward or refund)
```

### VAT Registration Threshold:
- **Mandatory:** Annual revenue > 1,800,000 THB
- **Voluntary:** Can register before reaching threshold
- **Must file PP30 every month, even if zero activity**

### Input Tax Credit Rules:
- Input tax invoices are valid for **6 months** from issue date
- Input tax from **abbreviated invoices** (ใบกำกับภาษีอย่างย่อ) is NOT creditable
- Input tax from **passenger vehicles (≤10 seats)** is NOT creditable
- Input tax from **entertainment expenses** is NOT creditable
- Input tax must relate to the **VAT-registered business activities**

---

## 4. Purchase Tax Report (รายงานภาษีซื้อ) — Required Columns

Per Revenue Department official format (from rd.go.th/fileadmin/images/image_law/images/vat-202-02.pdf):

| Column | Thai | English | Notes |
|---|---|---|---|
| 1 | ลำดับที่ | Sequence No. | Resequenced by taxpayer |
| 2 | วัน เดือน ปี | Date | Of the tax invoice |
| 3 | เลขที่ | Invoice No. | Tax invoice serial number |
| 4 | เล่มที่ | Book No. | If applicable |
| 5 | ชื่อผู้ขาย/ผู้ให้บริการ | Seller/Service Provider Name | — |
| 6 | เลขประจำตัวผู้เสียภาษีอากรของผู้ขาย | Seller's Tax ID | 13 digits |
| 7 | สถานประกอบการ (สำนักงานใหญ่/สาขาที่) | Business establishment (HQ/Branch) | HQ=00000, Branch=number |
| 8 | มูลค่าสินค้าหรือบริการ | Value of goods/services | Base amount |
| 9 | จำนวนเงินภาษีมูลค่าเพิ่ม | VAT amount | 7% of base |

### Sales Tax Report (รายงานภาษีขาย) — Same structure but for output VAT
Same columns, but for **buyers** instead of sellers.

---

## 5. PP30 (ภ.พ.30) VAT Return — Field Structure

From official form (rd.go.th PP30):

### Output Tax Section:
| Field | Description |
|---|---|
| 1 | Sales amount this month (ยอดขายในเดือนนี้) |
| 2 | Less: Sales at 0% rate (ยอดขายที่เสียภาษีในอัตราร้อยละ 0) |
| 3 | Less: Exempt sales (ยอดขายที่ได้รับยกเว้น) |
| 4 | Taxable sales = (1) - (2) - (3) |
| 5 | This month's output tax (ภาษีขายเดือนนี้) |

### Input Tax Section:
| Field | Description |
|---|---|
| 6 | Purchase amount eligible for input tax deduction |
| 7 | This month's input tax (ภาษีซื้อเดือนนี้) |

### Tax Computation:
| Field | Description |
|---|---|
| 8 | Tax payable = (5) - (7) if output > input |
| 9 | Excess tax = (7) - (5) if input > output |
| 10 | Excess tax carried forward from last month |
| 11 | Net tax payable = (8) - (10) if payable > carried forward |
| 12 | Net excess tax = carried forward remaining |
| 13 | Surcharge (for late filing) |
| 14 | Penalty (for late filing) |
| 15 | Total payable = (11) + (13) + (14) |
| 16 | Total excess after surcharge/penalty |

### Filing Info:
- Tax month selector (January-December)
- Year (Buddhist Era — พ.ศ.)
- Normal filing vs Additional filing
- Head Office or Branch
- Combined or Separated filing (for multi-branch)

---

## 6. WHT Certificate (50 Tawi / หนังสือรับรองหัก ณ ที่จ่าย) — Required Fields

Per Section 50 Bis of Revenue Code:

| Field | Description |
|---|---|
| **Payer section** | |
| ชื่อ | Name of payer (company/person) |
| ที่อยู่ | Address of payer |
| เลขประจำตัวผู้เสียภาษีอากร (13 หลัก) | Payer's 13-digit Tax ID |
| **Payee section** | |
| ชื่อ | Name of payee (company/person) |
| ที่อยู่ | Address of payee |
| เลขประจำตัวผู้เสียภาษีอากร (13 หลัก) | Payee's 13-digit Tax ID |
| **Income details** | |
| ประเภทเงินได้พึงประเมินที่จ่าย | Type of assessable income |
| วัน เดือน ปี ที่จ่าย | Date of payment |
| จำนวนเงินที่จ่าย | Amount paid |
| จำนวนเงินภาษีที่หักและนำส่ง | Tax withheld |
| เงื่อนไข | Condition: 1=WHT deducted, 2=payer bears tax |
| **Form reference** | |
| ลำดับที่ในแบบ | Sequence in PND form |
| Form type checkboxes | PND1a, PND2, PND3, PND53, etc. |
| **Certificate info** | |
| เล่มที่/เลขที่ | Book/Certificate number |
| วัน เดือน ปี ที่ออก | Date of issuance |
| ลายเซ็นผู้จ่ายเงิน | Payer's signature |
| ประทับตรานิติบุคคล | Corporate seal (if any) |

### Income Categories on 50 Tawi:
1. เงินเดือน ค่าจ้าง — Salary, wages (Section 40(1))
2. ค่าธรรมเนียม ค่านายหน้า — Fees, commissions (Section 40(2))
3. ค่าลิขสิทธิ์ — Royalties (Section 40(3))
4. (ก) ดอกเบี้ย — Interest (Section 40(4)(a))
4. (ข) เงินปันผล — Dividends (Section 40(4)(b))
5. ค่าเช่า — Rent (Section 40(5))
6. วิชาชีพอิสระ — Liberal professions (Section 40(6))
5+6. จ้างทำของ — Contract work / other

### Must produce 3 copies:
- Copy 1: For payee (attach to tax return)
- Copy 2: For payee (keep as evidence)
- Copy 3: For payer (keep as evidence)

---

## 7. PND3 & PND53 Form Structure

### PND3 (ภ.ง.ด.3) — WHT return for payments to INDIVIDUALS
### PND53 (ภ.ง.ด.53) — WHT return for payments to COMPANIES

Both forms have the same structure:

**Main form fields:**
| Field | Description |
|---|---|
| เลขประจำตัวผู้เสียภาษีอากร | Payer's Tax ID |
| สาขาที่ | Branch number |
| ยื่นปกติ/ยื่นเพิ่มเติมครั้งที่ | Normal or additional filing |
| สำหรับเดือน/ปี | For month/year |

**Summary section:**
| Field | Description |
|---|---|
| 1. รวมยอดเงินได้ทั้งสิ้น | Total income paid |
| 2. รวมยอดภาษีที่นำส่งทั้งสิ้น | Total tax withheld |
| 3. เงินเพิ่ม (ถ้ามี) | Surcharge (if any) |
| 4. รวมยอดภาษีที่นำส่ง + เงินเพิ่ม | Total = (2) + (3) |

**Attachment columns (ใบแนบ):**
| Column | Description |
|---|---|
| ลำดับที่ | Sequence number |
| ชื่อและที่อยู่ของผู้มีเงินได้ | Name and address of income recipient |
| วัน เดือน ปี ที่จ่าย | Date of payment |
| รายละเอียดเกี่ยวกับการจ่ายเงิน | Payment details (specify: rent, service fee, etc.) |
| อัตราภาษีร้อยละ | WHT rate (%) |
| จำนวนเงินที่จ่ายในครั้งนี้ | Amount paid this time |
| จำนวนเงินภาษีที่หักและนำส่ง | Tax withheld and remitted |
| เงื่อนไข | Condition (1=WHT deducted, 2=payer bears tax) |

---

## 8. Section 65 Tri — Non-Deductible Expenses (รายจ่ายต้องห้าม)

### Complete List for AI Flagging:

| # | Category | Rule | Flag in BanChee |
|---|---|---|---|
| (1) | Provisions/Reserves | Not deductible (except life insurance reserves ≤65%) | Flag any "สำรอง" expense |
| (2) | Capital/Fund contributions | Not deductible (except provident fund per MR) | Flag large fund transfers |
| (3) | Personal/Charitable | Deductible only up to **2% of net profit** | Flag when cumulative exceeds 2% |
| (4) | Entertainment | Deductible up to **0.3% of total revenue or paid-up capital** (whichever greater), max **10M THB** | Calculate running total, warn at threshold |
| (5) | Capital expenditure | Not deductible as expense (must depreciate) | Flag building renovations, equipment > threshold |
| (6) | Fines/penalties | Not deductible — including tax surcharges and criminal fines | Flag any ค่าปรับ, เงินเพิ่ม |
| (7) | Corporate income tax | Not deductible | Flag CIT payments |
| (8) | Expenses without identified recipient | Not deductible — must have receipt with recipient name | Flag expenses without proper receipts |
| (9) | VAT, input tax on passenger vehicles ≤10 seats | Not deductible as CIT expense (already claimed as input tax credit) | Flag vehicle-related VAT |
| (10) | Expenses not for business purpose | Not deductible | Flag personal-looking expenses |
| (11) | Expenses not for Thailand business | Not deductible (for foreign branches) | Flag international transfers |
| (12) | Excess purchase price without cause | Amount above normal price not deductible | Flag unusually high prices |
| (13) | Lost natural resources | Not deductible | Flag mining/resource losses |
| (14) | Asset value (except depreciation) | Not deductible | Flag write-downs |
| (18) | Expenses payable from post-period profits | Not deductible | Flag post-period accruals |

### Entertainment Expense Calculation:
```
Max deductible = MAX(total_revenue × 0.003, paid_up_capital × 0.003)
Cap = 10,000,000 THB
Actual deductible = MIN(actual_entertainment, max_deductible, 10,000,000)
Non-deductible = actual_entertainment - actual_deductible
```

---

## 9. SME Tax Rate Calculation

### Eligibility Criteria (BOTH must be met):
1. Paid-up capital ≤ 5,000,000 THB at end of accounting period
2. Annual revenue from sales/services ≤ 30,000,000 THB

### Progressive Rate Table:
| Net Profit (THB) | Rate | Tax |
|---|---|---|
| 0 — 300,000 | 0% | 0 |
| 300,001 — 3,000,000 | 15% | Up to 405,000 |
| Over 3,000,000 | 20% | — |

### Calculation Example (Net profit = 2,000,000):
```
First 300,000 × 0% = 0
Next 1,700,000 × 15% = 255,000
Total CIT = 255,000
```

### Non-SME Standard Rate:
- 20% flat on all net profit

### Key Dates:
- **PND50** (annual): Within 150 days of year-end (May 30 for calendar year)
- **PND51** (half-year): Within 2 months of first 6 months (August 31 for calendar year)
- **e-Filing extension:** +8 days for both

---

## 10. Filing Deadline Calendar

### Monthly Deadlines:

| Form | Paper Deadline | e-Filing Deadline | Purpose |
|---|---|---|---|
| ภ.พ.30 (PP30) | 15th of next month | 23rd of next month | VAT return |
| ภ.ง.ด.3 (PND3) | 7th of next month | 15th of next month | WHT - individuals |
| ภ.ง.ด.53 (PND53) | 7th of next month | 15th of next month | WHT - companies |
| ภ.ง.ด.1 (PND1) | 7th of next month | 15th of next month | WHT - employees |

### Annual Deadlines:

| Form | Deadline | e-Filing Extension | Purpose |
|---|---|---|---|
| ภ.ง.ด.50 (PND50) | May 30 | +8 days (Jun 7) | Annual CIT |
| ภ.ง.ด.51 (PND51) | Aug 31 | +8 days (Sep 8) | Half-year CIT |
| ภ.ง.ด.1ก (PND1a) | Feb 28 | +8 days (Mar 8) | Annual employee summary |

### Penalties:
- **Late filing:** 1,000–2,000 THB per form
- **Late payment:** 1.5% per month surcharge on outstanding tax
- **Additional filing underestimate (PND51):** 20% penalty if actual exceeds estimate by >25%

### Holiday Rule:
If deadline falls on a **weekend or public holiday**, it moves to the **next business day**.

---

## 11. Thailand Public Holidays 2026 (พ.ศ. 2569)

| Date | Day | Holiday |
|---|---|---|
| Jan 1 | Thu | New Year's Day |
| Jan 2 | Fri | Extra Holiday |
| Mar 3 | Tue | Makha Bucha Day |
| Apr 6 | Mon | Chakri Day |
| Apr 13-15 | Mon-Wed | Songkran Festival |
| May 1 | Fri | Labour Day |
| May 4 | Mon | Coronation Day |
| May 31 | Sun | Visakha Bucha Day |
| Jun 1 | Mon | Visakha Bucha (substitution) |
| Jun 3 | Wed | Queen Suthida's Birthday |
| Jul 28 | Tue | King's Birthday |
| Jul 29 | Wed | Asanha Bucha Day |
| Jul 30 | Thu | Buddhist Lent Day |
| Aug 12 | Wed | Queen Mother's Birthday |
| Oct 13 | Tue | King Bhumibol Memorial Day |
| Oct 23 | Fri | Chulalongkorn Memorial Day |
| Dec 5 | Sat | Father's Day |
| Dec 7 | Mon | Father's Day (substitution) |
| Dec 10 | Thu | Constitution Day |
| Dec 31 | Thu | New Year's Eve |

**Note:** Buddhist holidays (Makha Bucha, Visakha Bucha, Asanha Bucha) change each year based on lunar calendar. BanChee should allow manual holiday list updates per year.

---

## 12. Critical Implementation Notes

### VAT /107 Rounding:
- Always use **satang precision (2 decimal places)**
- Round to nearest satang (standard banking rounding — round half up)
- Store amounts as **integers (satang)** in database to avoid floating-point errors
- Display as Baht with 2 decimal places

### Thai Tax ID Format:
- Always **13 digits**
- For individuals: National ID card number
- For companies: Registration number from Department of Business Development
- For others: Tax ID from Revenue Department

### Buddhist Era (พ.ศ.) Conversion:
```
Buddhist Era = Gregorian Year + 543
พ.ศ. 2569 = 2026 CE
```

### 2025 WHT Changes:
Thailand introduced **mandatory e-filing for WHT** starting 2025. Companies must file PND3/PND53 electronically. Paper filing is being phased out.

---

*This document is the single source of truth for Thai tax implementation in BanChee. All calculations, validations, and form structures should reference this file.*
