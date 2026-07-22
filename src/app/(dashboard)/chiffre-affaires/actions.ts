"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const revenueSchema = z.object({
  date: z.string().min(1, "La date est obligatoire"),
  amountTTC: z.coerce.number().min(0),
  note: z.string().trim().optional(),
});

function parseDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function upsertDailyRevenue(formData: FormData) {
  const parsed = revenueSchema.parse({
    date: formData.get("date"),
    amountTTC: formData.get("amountTTC"),
    note: formData.get("note") || undefined,
  });

  const date = parseDate(parsed.date);

  await prisma.dailyRevenue.upsert({
    where: { date },
    update: { amountTTC: parsed.amountTTC, note: parsed.note || null },
    create: { date, amountTTC: parsed.amountTTC, note: parsed.note || null },
  });

  revalidatePath("/chiffre-affaires");
}

export async function deleteDailyRevenue(id: string) {
  await prisma.dailyRevenue.delete({ where: { id } });
  revalidatePath("/chiffre-affaires");
}
