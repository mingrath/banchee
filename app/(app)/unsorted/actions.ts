"use server"

import { AnalysisResult, analyzeTransaction } from "@/ai/analyze"
import { AnalyzeAttachment, loadAttachmentsForAI } from "@/ai/attachments"
import { buildLLMPrompt } from "@/ai/prompt"
import { fieldsToJsonSchema } from "@/ai/schema"
import { correctBuddhistEraDate, validateTaxInvoiceFields } from "@/ai/validators/tax-invoice-validator"
import { validateNonDeductibleExpense } from "@/ai/validators/non-deductible-validator"
import { transactionFormSchema } from "@/forms/transactions"
import { ActionState } from "@/lib/actions"
import { getCurrentUser, isAiBalanceExhausted, isSubscriptionExpired } from "@/lib/auth"
import {
  getDirectorySize,
  getTransactionFileUploadPath,
  getUserUploadsDirectory,
  safePathJoin,
  unsortedFilePath,
} from "@/lib/files"
import { DEFAULT_PROMPT_ANALYSE_NEW_FILE } from "@/models/defaults"
import { createFile, deleteFile, getFileById, updateFile } from "@/models/files"
import { createTransaction, TransactionData, updateTransactionFiles } from "@/models/transactions"
import { updateUser } from "@/models/users"
import { extractVATFromTotal } from "@/services/tax-calculator"
import { Category, Field, File, Project, Transaction } from "@/prisma/client"
import { randomUUID } from "crypto"
import { mkdir, readFile, rename, writeFile } from "fs/promises"
import { revalidatePath } from "next/cache"
import path from "path"

export async function analyzeFileAction(
  file: File,
  settings: Record<string, string>,
  fields: Field[],
  categories: Category[],
  projects: Project[]
): Promise<ActionState<AnalysisResult>> {
  const user = await getCurrentUser()

  if (!file || file.userId !== user.id) {
    return { success: false, error: "File not found or does not belong to the user" }
  }

  if (isAiBalanceExhausted(user)) {
    return {
      success: false,
      error: "You used all of your pre-paid AI scans, please upgrade your account or buy new subscription plan",
    }
  }

  if (isSubscriptionExpired(user)) {
    return {
      success: false,
      error: "Your subscription has expired, please upgrade your account or buy new subscription plan",
    }
  }

  let attachments: AnalyzeAttachment[] = []
  try {
    attachments = await loadAttachmentsForAI(user, file)
  } catch (error) {
    console.error("Failed to retrieve files:", error)
    return { success: false, error: "Failed to retrieve files: " + error }
  }

  const prompt = buildLLMPrompt(
    settings.prompt_analyse_new_file || DEFAULT_PROMPT_ANALYSE_NEW_FILE,
    fields,
    categories,
    projects
  )

  const schema = fieldsToJsonSchema(fields)

  const results = await analyzeTransaction(prompt, schema, attachments, file.id, user.id)

  console.log("Analysis results:", results)

  if (results.data?.tokensUsed && results.data.tokensUsed > 0) {
    await updateUser(user.id, { aiBalance: { decrement: 1 } })
  }

  // Post-extraction: correct B.E. dates and validate tax invoice fields
  if (results.success && results.data?.output) {
    const output = results.data.output

    // Correct Buddhist Era dates
    if (output.issuedAt) {
      output.issuedAt = correctBuddhistEraDate(output.issuedAt)
    }

    // Validate against Section 86/4 requirements
    const validation = validateTaxInvoiceFields(output as Record<string, unknown>)
    ;(output as Record<string, unknown>)._validation = validation

    // Validate non-deductible expense status (Section 65 tri)
    const nonDeductibleFlag = validateNonDeductibleExpense(output as Record<string, unknown>)
    if (nonDeductibleFlag.isNonDeductible) {
      const outputRecord = output as Record<string, unknown>
      outputRecord.is_non_deductible = true
      outputRecord.non_deductible_reason = nonDeductibleFlag.reason
      outputRecord.non_deductible_category = nonDeductibleFlag.category
    }
  }

  return results
}

export async function saveFileAsTransactionAction(
  _prevState: ActionState<Transaction> | null,
  formData: FormData
): Promise<ActionState<Transaction>> {
  try {
    const user = await getCurrentUser()
    const validatedForm = transactionFormSchema.safeParse(Object.fromEntries(formData.entries()))

    if (!validatedForm.success) {
      return { success: false, error: validatedForm.error.message }
    }

    // Get the file record
    const fileId = formData.get("fileId") as string
    const file = await getFileById(fileId, user.id)
    if (!file) throw new Error("File not found")

    // Map Thai tax fields to first-class Prisma columns
    const transactionData: TransactionData = { ...validatedForm.data }

    // Extract VAT-specific fields from form data
    const merchantTaxId = formData.get("merchantTaxId") as string | null
    const merchantBranch = formData.get("merchantBranch") as string | null
    const documentNumber = formData.get("documentNumber") as string | null
    const vatType = formData.get("vatType") as string | null
    const vatAmountStr = formData.get("vatAmount") as string | null
    const subtotalStr = formData.get("subtotal") as string | null

    if (merchantTaxId) transactionData.merchantTaxId = merchantTaxId
    if (merchantBranch) transactionData.merchantBranch = merchantBranch
    if (documentNumber) transactionData.documentNumber = documentNumber
    if (vatType && vatType !== "none") transactionData.vatType = vatType

    // Convert vatAmount and subtotal to satang integers
    if (vatAmountStr && vatAmountStr.trim() !== "") {
      const vatAmountNum = parseFloat(vatAmountStr)
      if (!isNaN(vatAmountNum)) {
        transactionData.vatAmount = Math.round(vatAmountNum * 100)
      }
    }

    if (subtotalStr && subtotalStr.trim() !== "") {
      const subtotalNum = parseFloat(subtotalStr)
      if (!isNaN(subtotalNum)) {
        transactionData.subtotal = Math.round(subtotalNum * 100)
      }
    }

    // If we have a total and vatType but no explicit subtotal/vatAmount, auto-compute
    if (transactionData.total && transactionData.vatType && !transactionData.subtotal) {
      const vatResult = extractVATFromTotal(transactionData.total)
      transactionData.subtotal = vatResult.subtotal
      transactionData.vatAmount = vatResult.vatAmount
    }

    // Set default VAT rate (700 = 7%)
    if (transactionData.vatType) {
      transactionData.vatRate = 700
    }

    // Create transaction
    const transaction = await createTransaction(user.id, transactionData)

    // Move file to processed location
    const userUploadsDirectory = getUserUploadsDirectory(user)
    const originalFileName = path.basename(file.path)
    const newRelativeFilePath = getTransactionFileUploadPath(file.id, originalFileName, transaction)

    // Move file to new location and name
    const oldFullFilePath = safePathJoin(userUploadsDirectory, file.path)
    const newFullFilePath = safePathJoin(userUploadsDirectory, newRelativeFilePath)
    await mkdir(path.dirname(newFullFilePath), { recursive: true })
    await rename(path.resolve(oldFullFilePath), path.resolve(newFullFilePath))

    // Update file record
    await updateFile(file.id, user.id, {
      path: newRelativeFilePath,
      isReviewed: true,
    })

    await updateTransactionFiles(transaction.id, user.id, [file.id])

    revalidatePath("/unsorted")
    revalidatePath("/transactions")

    return { success: true, data: transaction }
  } catch (error) {
    console.error("Failed to save transaction:", error)
    return { success: false, error: `Failed to save transaction: ${error}` }
  }
}

export async function deleteUnsortedFileAction(
  _prevState: ActionState<Transaction> | null,
  fileId: string
): Promise<ActionState<Transaction>> {
  try {
    const user = await getCurrentUser()
    await deleteFile(fileId, user.id)
    revalidatePath("/unsorted")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete file:", error)
    return { success: false, error: "Failed to delete file" }
  }
}

export async function splitFileIntoItemsAction(
  _prevState: ActionState<null> | null,
  formData: FormData
): Promise<ActionState<null>> {
  try {
    const user = await getCurrentUser()
    const fileId = formData.get("fileId") as string
    const items = JSON.parse(formData.get("items") as string) as TransactionData[]

    if (!fileId || !items || items.length === 0) {
      return { success: false, error: "File ID and items are required" }
    }

    // Get the original file
    const originalFile = await getFileById(fileId, user.id)
    if (!originalFile) {
      return { success: false, error: "Original file not found" }
    }

    // Get the original file's content
    const userUploadsDirectory = getUserUploadsDirectory(user)
    const originalFilePath = safePathJoin(userUploadsDirectory, originalFile.path)
    const fileContent = await readFile(originalFilePath)

    // Create a new file for each item
    for (const item of items) {
      const fileUuid = randomUUID()
      const fileName = `${originalFile.filename}-part-${item.name}`
      const relativeFilePath = unsortedFilePath(fileUuid, fileName)
      const fullFilePath = safePathJoin(userUploadsDirectory, relativeFilePath)

      // Create directory if it doesn't exist
      await mkdir(path.dirname(fullFilePath), { recursive: true })

      // Copy the original file content
      await writeFile(fullFilePath, fileContent)

      // Create file record in database with the item data cached
      await createFile(user.id, {
        id: fileUuid,
        filename: fileName,
        path: relativeFilePath,
        mimetype: originalFile.mimetype,
        metadata: originalFile.metadata,
        isSplitted: true,
        cachedParseResult: {
          name: item.name,
          merchant: item.merchant,
          description: item.description,
          total: item.total,
          currencyCode: item.currencyCode,
          categoryCode: item.categoryCode,
          projectCode: item.projectCode,
          type: item.type,
          issuedAt: item.issuedAt,
          note: item.note,
          text: item.text,
        },
      })
    }

    // Delete the original file
    await deleteFile(fileId, user.id)

    // Update user storage used
    const storageUsed = await getDirectorySize(getUserUploadsDirectory(user))
    await updateUser(user.id, { storageUsed })

    revalidatePath("/unsorted")
    return { success: true }
  } catch (error) {
    console.error("Failed to split file into items:", error)
    return { success: false, error: `Failed to split file into items: ${error}` }
  }
}
