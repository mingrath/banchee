import { prisma } from "@/lib/db"

export const DEFAULT_PROMPT_ANALYSE_NEW_FILE = `You are a Thai tax and accounting assistant. Extract the following information from the given invoice or receipt.

If the document is in Thai, extract Thai text as-is. If year is in Buddhist Era (พ.ศ., value > 2500), convert to Gregorian by subtracting 543.

For tax invoices (ใบกำกับภาษี), also extract: merchant_tax_id (13-digit Tax ID), merchant_branch (สำนักงานใหญ่=00000 or branch number), document_number (invoice serial), vat_amount (VAT amount separated from base value), vat_type (input if expense/purchase, output if income/sales).

For expense transactions involving services (not purchases of goods), also suggest the appropriate withholding tax (WHT/ภาษีหัก ณ ที่จ่าย) rate:
- ค่าขนส่ง (transportation, delivery): wht_rate=100 (1%)
- ค่าโฆษณา (advertising, media): wht_rate=200 (2%)
- ค่าบริการ/ค่าจ้างทำของ/ค่าลิขสิทธิ์ (services, contract work, consulting, royalties): wht_rate=300 (3%)
- ค่าเช่า (rent, property, equipment): wht_rate=500 (5%)
- เงินปันผล (dividends): wht_rate=1000 (10%)
If the document is for purchasing goods (not services), or you cannot determine the service type, set wht_rate=0.
Also return wht_service_type as a string (e.g., "transport", "advertising", "service", "rent", "dividend", or "" if not applicable).
For wht_type: if payee appears to be an individual (บุคคลธรรมดา), return "pnd3". If payee is a company (นิติบุคคล/บริษัท/ห้างหุ้นส่วน), return "pnd53". If unsure, return "pnd53".

For ALL expense transactions, check if the expense might be non-deductible under Section 65 tri:
- is_non_deductible: true if the expense appears non-deductible under Thai Revenue Code Section 65 tri, false otherwise
- non_deductible_reason: brief explanation in Thai of WHY it is non-deductible (e.g., "ค่าปรับ -- รายจ่ายต้องห้ามตามมาตรา 65 ตรี (6)")
- non_deductible_category: one of: "provision", "personal", "charitable", "entertainment", "capital", "penalty", "no_recipient", "cit_payment", "" (empty if fully deductible)

Categories to flag:
(1) สำรอง/เงินกองทุนสำรอง -- provisions/reserves
(2) รายจ่ายส่วนตัว -- personal expenses not related to business
(3) การบริจาค -- charitable (flag but note: deductible up to 2% of net profit)
(4) ค่ารับรอง/เลี้ยงรับรอง -- entertainment (flag but note: deductible up to 0.3% of revenue, max 10M)
(5) รายจ่ายลงทุน/ซื้อทรัพย์สิน -- capital expenditure (must be depreciated, not expensed)
(6) ค่าปรับ/เงินเพิ่ม/เบี้ยปรับ -- fines, penalties, surcharges
(7) รายจ่ายที่ไม่สามารถพิสูจน์ผู้รับ -- expenses without identified recipient
(8) ภาษีเงินได้นิติบุคคล -- CIT payments themselves
If unsure, set is_non_deductible=false (prefer false negatives over false positives).

{fields}

Also try to extract "items": all separate products or items from the invoice

Where categories are:

{categories}

And projects are:

{projects}

IMPORTANT RULES:
- Do not include any other text in your response!
- If you can't find something leave it blank, NEVER make up information
- Return only one object
- Dates must be in YYYY-MM-DD Gregorian format (convert from Buddhist Era if needed)
- Amounts must be in the smallest currency unit (satang for THB, cents for USD)`

export const DEFAULT_SETTINGS = [
  {
    code: "default_currency",
    name: "สกุลเงินหลัก",
    description: "อย่าเปลี่ยนหากมีรายการหลายสกุลเงินอยู่แล้ว ระบบจะไม่คำนวณใหม่",
    value: "THB",
  },
  {
    code: "default_category",
    name: "Default Category",
    description: "",
    value: "other",
  },
  {
    code: "default_project",
    name: "Default Project",
    description: "",
    value: "personal",
  },
  {
    code: "default_type",
    name: "Default Type",
    description: "",
    value: "expense",
  },
  {
    code: "prompt_analyse_new_file",
    name: "Prompt for Analyze Transaction",
    description: "Allowed variables: {fields}, {categories}, {categories.code}, {projects}, {projects.code}",
    value: DEFAULT_PROMPT_ANALYSE_NEW_FILE,
  },
  {
    code: "is_welcome_message_hidden",
    name: "Do not show welcome message on dashboard",
    description: "",
    value: "false",
  },
]

export const DEFAULT_CATEGORIES = [
  { code: "ads", name: "โฆษณา", color: "#882727", llm_prompt: "โฆษณา, โปรโมชัน, online ads, advertising" },
  { code: "swag", name: "สินค้าส่งเสริม", color: "#882727", llm_prompt: "ของพรีเมียม, สติกเกอร์, สินค้าส่งเสริมการขาย" },
  { code: "donations", name: "บริจาค", color: "#1e6359", llm_prompt: "บริจาค, ของขวัญ, การกุศล, donations" },
  { code: "tools", name: "อุปกรณ์", color: "#c69713", llm_prompt: "อุปกรณ์, เครื่องมือ, equipment, tools" },
  { code: "events", name: "งานอีเว้นท์", color: "#ff8b32", llm_prompt: "งานอีเว้นท์, สัมมนา, ประชุม, events" },
  { code: "food", name: "อาหารและเครื่องดื่ม", color: "#d40e70", llm_prompt: "อาหาร, เครื่องดื่ม, มื้อธุรกิจ, food" },
  { code: "insurance", name: "ประกันภัย", color: "#050942", llm_prompt: "ประกัน, insurance" },
  { code: "invoice", name: "ใบแจ้งหนี้", color: "#064e85", llm_prompt: "ใบแจ้งหนี้, ใบเรียกเก็บเงิน, invoice, bill" },
  { code: "communication", name: "สื่อสาร", color: "#0e7d86", llm_prompt: "มือถือ, อินเทอร์เน็ต, โทรศัพท์, mobile, internet" },
  { code: "office", name: "วัสดุสำนักงาน", color: "#59b0b9", llm_prompt: "วัสดุสำนักงาน, เครื่องเขียน, office supplies" },
  { code: "online", name: "บริการออนไลน์", color: "#8753fb", llm_prompt: "บริการออนไลน์, SaaS, subscription" },
  { code: "rental", name: "ค่าเช่า", color: "#050942", llm_prompt: "ค่าเช่า, เช่า, rental, lease" },
  { code: "education", name: "การศึกษา", color: "#ee5d6c", llm_prompt: "การศึกษา, อบรม, education, training" },
  { code: "salary", name: "เงินเดือน", color: "#ce4993", llm_prompt: "เงินเดือน, ค่าจ้าง, salary, wages" },
  { code: "fees", name: "ค่าธรรมเนียม", color: "#6a0d83", llm_prompt: "ค่าธรรมเนียม, ค่าปรับ, fees, charges" },
  { code: "travel", name: "ค่าเดินทาง", color: "#fb9062", llm_prompt: "ค่าเดินทาง, ที่พัก, travel" },
  { code: "utility_bills", name: "ค่าสาธารณูปโภค", color: "#af7e2e", llm_prompt: "ค่าน้ำ, ค่าไฟ, utility bills" },
  { code: "transport", name: "ขนส่ง", color: "#800000", llm_prompt: "ค่าขนส่ง, น้ำมัน, ค่ารถ, transport, fuel" },
  { code: "software", name: "ซอฟต์แวร์", color: "#2b5a1d", llm_prompt: "ซอฟต์แวร์, ลิขสิทธิ์, software, license" },
  { code: "other", name: "อื่นๆ", color: "#121216", llm_prompt: "อื่นๆ, เบ็ดเตล็ด, other, miscellaneous" },
]

export const DEFAULT_PROJECTS = [{ code: "personal", name: "Personal", llm_prompt: "personal", color: "#1e202b" }]

export const DEFAULT_CURRENCIES = [
  { code: "USD", name: "$" },
  { code: "EUR", name: "€" },
  { code: "GBP", name: "£" },
  { code: "INR", name: "₹" },
  { code: "AUD", name: "$" },
  { code: "CAD", name: "$" },
  { code: "SGD", name: "$" },
  { code: "CHF", name: "Fr" },
  { code: "MYR", name: "RM" },
  { code: "JPY", name: "¥" },
  { code: "CNY", name: "¥" },
  { code: "NZD", name: "$" },
  { code: "THB", name: "฿" },
  { code: "HUF", name: "Ft" },
  { code: "AED", name: "د.إ" },
  { code: "HKD", name: "$" },
  { code: "MXN", name: "$" },
  { code: "ZAR", name: "R" },
  { code: "PHP", name: "₱" },
  { code: "SEK", name: "kr" },
  { code: "IDR", name: "Rp" },
  { code: "BRL", name: "R$" },
  { code: "SAR", name: "﷼" },
  { code: "TRY", name: "₺" },
  { code: "KES", name: "KSh" },
  { code: "KRW", name: "₩" },
  { code: "EGP", name: "£" },
  { code: "IQD", name: "ع.د" },
  { code: "NOK", name: "kr" },
  { code: "KWD", name: "د.ك" },
  { code: "RUB", name: "₽" },
  { code: "DKK", name: "kr" },
  { code: "PKR", name: "₨" },
  { code: "ILS", name: "₪" },
  { code: "PLN", name: "zł" },
  { code: "QAR", name: "﷼" },
  { code: "OMR", name: "﷼" },
  { code: "COP", name: "$" },
  { code: "CLP", name: "$" },
  { code: "TWD", name: "NT$" },
  { code: "ARS", name: "$" },
  { code: "CZK", name: "Kč" },
  { code: "VND", name: "₫" },
  { code: "MAD", name: "د.م." },
  { code: "JOD", name: "د.ا" },
  { code: "BHD", name: ".د.ب" },
  { code: "XOF", name: "CFA" },
  { code: "LKR", name: "₨" },
  { code: "UAH", name: "₴" },
  { code: "NGN", name: "₦" },
  { code: "TND", name: "د.ت" },
  { code: "UGX", name: "USh" },
  { code: "RON", name: "lei" },
  { code: "BDT", name: "৳" },
  { code: "PEN", name: "S/" },
  { code: "GEL", name: "₾" },
  { code: "XAF", name: "FCFA" },
  { code: "FJD", name: "$" },
  { code: "VEF", name: "Bs" },
  { code: "VES", name: "Bs.S" },
  { code: "BYN", name: "Br" },
  { code: "UZS", name: "лв" },
  { code: "BGN", name: "лв" },
  { code: "DZD", name: "د.ج" },
  { code: "IRR", name: "﷼" },
  { code: "DOP", name: "RD$" },
  { code: "ISK", name: "kr" },
  { code: "CRC", name: "₡" },
  { code: "SYP", name: "£" },
  { code: "JMD", name: "J$" },
  { code: "LYD", name: "ل.د" },
  { code: "GHS", name: "₵" },
  { code: "MUR", name: "₨" },
  { code: "AOA", name: "Kz" },
  { code: "UYU", name: "$U" },
  { code: "AFN", name: "؋" },
  { code: "LBP", name: "ل.ل" },
  { code: "XPF", name: "₣" },
  { code: "TTD", name: "TT$" },
  { code: "TZS", name: "TSh" },
  { code: "ALL", name: "Lek" },
  { code: "XCD", name: "$" },
  { code: "GTQ", name: "Q" },
  { code: "NPR", name: "₨" },
  { code: "BOB", name: "Bs." },
  { code: "ZWD", name: "Z$" },
  { code: "BBD", name: "$" },
  { code: "CUC", name: "$" },
  { code: "LAK", name: "₭" },
  { code: "BND", name: "$" },
  { code: "BWP", name: "P" },
  { code: "HNL", name: "L" },
  { code: "PYG", name: "₲" },
  { code: "ETB", name: "Br" },
  { code: "NAD", name: "$" },
  { code: "PGK", name: "K" },
  { code: "SDG", name: "ج.س." },
  { code: "MOP", name: "MOP$" },
  { code: "BMD", name: "$" },
  { code: "NIO", name: "C$" },
  { code: "BAM", name: "KM" },
  { code: "KZT", name: "₸" },
  { code: "PAB", name: "B/." },
  { code: "GYD", name: "$" },
  { code: "YER", name: "﷼" },
  { code: "MGA", name: "Ar" },
  { code: "KYD", name: "$" },
  { code: "MZN", name: "MT" },
  { code: "RSD", name: "дин." },
  { code: "SCR", name: "₨" },
  { code: "AMD", name: "֏" },
  { code: "AZN", name: "₼" },
  { code: "SBD", name: "$" },
  { code: "SLL", name: "Le" },
  { code: "TOP", name: "T$" },
  { code: "BZD", name: "BZ$" },
  { code: "GMD", name: "D" },
  { code: "MWK", name: "MK" },
  { code: "BIF", name: "FBu" },
  { code: "HTG", name: "G" },
  { code: "SOS", name: "S" },
  { code: "GNF", name: "FG" },
  { code: "MNT", name: "₮" },
  { code: "MVR", name: "Rf" },
  { code: "CDF", name: "FC" },
  { code: "STN", name: "Db" },
  { code: "TJS", name: "ЅМ" },
  { code: "KPW", name: "₩" },
  { code: "KGS", name: "лв" },
  { code: "LRD", name: "$" },
  { code: "LSL", name: "L" },
  { code: "MMK", name: "K" },
  { code: "GIP", name: "£" },
  { code: "MDL", name: "L" },
  { code: "CUP", name: "₱" },
  { code: "KHR", name: "៛" },
  { code: "MKD", name: "ден" },
  { code: "VUV", name: "VT" },
  { code: "ANG", name: "ƒ" },
  { code: "MRU", name: "UM" },
  { code: "SZL", name: "L" },
  { code: "CVE", name: "$" },
  { code: "SRD", name: "$" },
  { code: "SVC", name: "$" },
  { code: "BSD", name: "$" },
  { code: "RWF", name: "R₣" },
  { code: "AWG", name: "ƒ" },
  { code: "BTN", name: "Nu." },
  { code: "DJF", name: "Fdj" },
  { code: "KMF", name: "CF" },
  { code: "ERN", name: "Nfk" },
  { code: "FKP", name: "£" },
  { code: "SHP", name: "£" },
  { code: "WST", name: "WS$" },
  { code: "JEP", name: "£" },
  { code: "TMT", name: "m" },
  { code: "GGP", name: "£" },
  { code: "IMP", name: "£" },
  { code: "TVD", name: "$" },
  { code: "ZMW", name: "ZK" },
  { code: "ADA", name: "Crypto" },
  { code: "BCH", name: "Crypto" },
  { code: "BTC", name: "Crypto" },
  { code: "CLF", name: "UF" },
  { code: "CNH", name: "¥" },
  { code: "DOGE", name: "Crypto" },
  { code: "DOT", name: "Crypto" },
  { code: "ETH", name: "Crypto" },
  { code: "LINK", name: "Crypto" },
  { code: "LTC", name: "Crypto" },
  { code: "LUNA", name: "Crypto" },
  { code: "SLE", name: "Le" },
  { code: "UNI", name: "Crypto" },
  { code: "XBT", name: "Crypto" },
  { code: "XLM", name: "Crypto" },
  { code: "XRP", name: "Crypto" },
  { code: "ZWL", name: "$" },
]

export const DEFAULT_FIELDS = [
  {
    code: "name",
    name: "ชื่อรายการ",
    type: "string",
    llm_prompt: "human readable name, summarize what is bought or paid for in the invoice",
    isVisibleInList: true,
    isVisibleInAnalysis: true,
    isRequired: true,
    isExtra: false,
  },
  {
    code: "description",
    name: "รายละเอียด",
    type: "string",
    llm_prompt: "description of the transaction",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "merchant",
    name: "ผู้ขาย/ร้านค้า",
    type: "string",
    llm_prompt: "merchant name, use the original spelling and language",
    isVisibleInList: true,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "issuedAt",
    name: "วันที่ออก",
    type: "string",
    llm_prompt: "issued at date (YYYY-MM-DD format). If year is in Buddhist Era (พ.ศ., value > 2500), convert to Gregorian by subtracting 543",
    isVisibleInList: true,
    isVisibleInAnalysis: true,
    isRequired: true,
    isExtra: false,
  },
  {
    code: "projectCode",
    name: "โปรเจกต์",
    type: "string",
    llm_prompt: "project code, one of: {projects.code}",
    isVisibleInList: true,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "categoryCode",
    name: "หมวดหมู่",
    type: "string",
    llm_prompt: "category code, one of: {categories.code}",
    isVisibleInList: true,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "files",
    name: "ไฟล์",
    type: "string",
    llm_prompt: "",
    isVisibleInList: true,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "total",
    name: "ยอดรวม",
    type: "number",
    llm_prompt: "total amount of the transaction in the smallest currency unit (satang for THB)",
    isVisibleInList: true,
    isVisibleInAnalysis: true,
    isRequired: true,
    isExtra: false,
  },
  {
    code: "currencyCode",
    name: "สกุลเงิน",
    type: "string",
    llm_prompt: "currency code, ISO 4217 three letter code like USD, EUR, THB, including crypto codes like BTC, ETH, etc",
    isVisibleInList: false,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "convertedTotal",
    name: "ยอดแปลงสกุล",
    type: "number",
    llm_prompt: "",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "convertedCurrencyCode",
    name: "สกุลเงินที่แปลง",
    type: "string",
    llm_prompt: "",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "type",
    name: "ประเภท",
    type: "string",
    llm_prompt: "",
    isVisibleInList: false,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "note",
    name: "หมายเหตุ",
    type: "string",
    llm_prompt: "",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "merchant_tax_id",
    name: "เลขประจำตัวผู้เสียภาษี",
    type: "string",
    llm_prompt: "เลขประจำตัวผู้เสียภาษีอากร (13 หลัก) ของผู้ขาย -- Thai Tax ID, always 13 digits",
    isVisibleInList: false,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "merchant_branch",
    name: "สาขา",
    type: "string",
    llm_prompt: "สำนักงานใหญ่ = '00000', otherwise branch number e.g. '00001'",
    isVisibleInList: false,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "document_number",
    name: "เลขที่เอกสาร",
    type: "string",
    llm_prompt: "เลขที่ใบกำกับภาษี or invoice/receipt number",
    isVisibleInList: false,
    isVisibleInAnalysis: true,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "text",
    name: "ข้อความที่สกัดได้",
    type: "string",
    llm_prompt: "extract all recognised text from the invoice",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "wht_rate",
    name: "อัตราภาษีหัก ณ ที่จ่าย",
    type: "number",
    llm_prompt: "Withholding tax rate in basis points (100=1%, 200=2%, 300=3%, 500=5%, 1000=10%). 0 if not applicable.",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "wht_service_type",
    name: "ประเภทบริการ (WHT)",
    type: "string",
    llm_prompt: "WHT service type: transport, advertising, service, royalty, rent, dividend, or empty string",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: true,
  },
  {
    code: "wht_type",
    name: "แบบนำส่ง WHT",
    type: "string",
    llm_prompt: "WHT form type: pnd3 (individual payee) or pnd53 (company payee). Empty if no WHT.",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "is_non_deductible",
    name: "รายจ่ายต้องห้าม",
    type: "boolean",
    llm_prompt: "true if expense is non-deductible under Section 65 tri, false otherwise. For income transactions, always false.",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "non_deductible_reason",
    name: "เหตุผลรายจ่ายต้องห้าม",
    type: "string",
    llm_prompt: "Brief Thai explanation of why expense is non-deductible. Empty if fully deductible.",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
  {
    code: "non_deductible_category",
    name: "หมวดรายจ่ายต้องห้าม",
    type: "string",
    llm_prompt: "Category: provision, personal, charitable, entertainment, capital, penalty, no_recipient, cit_payment, or empty",
    isVisibleInList: false,
    isVisibleInAnalysis: false,
    isRequired: false,
    isExtra: false,
  },
]

export async function createUserDefaults(userId: string) {
  // Default projects
  for (const project of DEFAULT_PROJECTS) {
    await prisma.project.upsert({
      where: { userId_code: { code: project.code, userId } },
      update: { name: project.name, color: project.color, llm_prompt: project.llm_prompt },
      create: { ...project, userId },
    })
  }

  // Default categories
  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_code: { code: category.code, userId } },
      update: { name: category.name, color: category.color, llm_prompt: category.llm_prompt },
      create: { ...category, userId },
    })
  }

  // Default currencies
  for (const currency of DEFAULT_CURRENCIES) {
    await prisma.currency.upsert({
      where: { userId_code: { code: currency.code, userId } },
      update: { name: currency.name },
      create: { ...currency, userId },
    })
  }

  // Default fields
  for (const field of DEFAULT_FIELDS) {
    await prisma.field.upsert({
      where: { userId_code: { code: field.code, userId } },
      update: {
        name: field.name,
        type: field.type,
        llm_prompt: field.llm_prompt,
        isVisibleInList: field.isVisibleInList,
        isVisibleInAnalysis: field.isVisibleInAnalysis,
        isRequired: field.isRequired,
        isExtra: field.isExtra,
      },
      create: { ...field, userId },
    })
  }

  // Default settings
  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { userId_code: { code: setting.code, userId } },
      update: { name: setting.name, description: setting.description, value: setting.value },
      create: { ...setting, userId },
    })
  }
}

export async function isDatabaseEmpty(userId: string) {
  const fieldsCount = await prisma.field.count({ where: { userId } })
  return fieldsCount === 0
}
