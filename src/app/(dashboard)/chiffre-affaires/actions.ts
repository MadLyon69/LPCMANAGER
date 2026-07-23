"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const revenueSchema = z.object({
  periodType: z.enum(["JOUR", "MOIS"]),
  date: z.string().min(1, "La date est obligatoire"),
  categoryId: z.string().trim().optional(),
  tvaRate: z.string().trim().optional(),
  amountTTC: z.coerce.number().min(0),
  note: z.string().trim().optional(),
});

function parsePeriodDate(periodType: "JOUR" | "MOIS", dateStr: string): Date {
  if (periodType === "MOIS") {
    // dateStr au format "YYYY-MM" (input type="month") : on retient le 1er du mois.
    return new Date(`${dateStr}-01T00:00:00.000Z`);
  }
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function parseRevenueForm(formData: FormData) {
  const parsed = revenueSchema.parse({
    periodType: formData.get("periodType"),
    date: formData.get("date"),
    categoryId: formData.get("categoryId") || undefined,
    tvaRate: formData.get("tvaRate") || undefined,
    amountTTC: formData.get("amountTTC"),
    note: formData.get("note") || undefined,
  });

  return {
    periodType: parsed.periodType,
    date: parsePeriodDate(parsed.periodType, parsed.date),
    categoryId: parsed.categoryId || null,
    tvaRate: parsed.tvaRate ? Number(parsed.tvaRate) : null,
    amountTTC: parsed.amountTTC,
    note: parsed.note || null,
  };
}

export async function createRevenueEntry(formData: FormData) {
  const data = parseRevenueForm(formData);
  await prisma.revenueEntry.create({ data });
  revalidatePath("/chiffre-affaires");
}

export async function updateRevenueEntry(id: string, formData: FormData) {
  const data = parseRevenueForm(formData);
  await prisma.revenueEntry.update({ where: { id }, data });
  revalidatePath("/chiffre-affaires");
}

export async function deleteRevenueEntry(id: string) {
  await prisma.revenueEntry.delete({ where: { id } });
  revalidatePath("/chiffre-affaires");
}
