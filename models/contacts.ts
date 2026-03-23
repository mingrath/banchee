import { prisma } from "@/lib/db"
import type { Contact } from "@/prisma/client"

export async function createContact(userId: string, data: {
  name: string; taxId: string; branch?: string; address?: string; type?: string
}): Promise<Contact> {
  return prisma.contact.upsert({
    where: {
      userId_taxId_branch: {
        userId,
        taxId: data.taxId,
        branch: data.branch ?? "00000",
      },
    },
    update: {
      name: data.name,
      address: data.address ?? "",
      type: data.type ?? "vendor",
    },
    create: {
      userId,
      name: data.name,
      taxId: data.taxId,
      branch: data.branch ?? "00000",
      address: data.address ?? "",
      type: data.type ?? "vendor",
    },
  })
}

export async function searchContacts(userId: string, query: string): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: {
      userId,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { taxId: { contains: query } },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
  })
}

export async function getContactById(userId: string, contactId: string): Promise<Contact | null> {
  return prisma.contact.findFirst({
    where: { id: contactId, userId },
  })
}

export async function getContactsByUserId(userId: string): Promise<Contact[]> {
  return prisma.contact.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  })
}
