"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  labelWidthMm: z.coerce.number().min(5).max(200),
  labelHeightMm: z.coerce.number().min(5).max(200),
  labelColumns: z.coerce.number().int().min(1).max(10),
  defaultTvaRate: z.coerce.number().min(0).max(100),
  defaultMarginRate: z.coerce.number(),
});

export async function updateSettings(formData: FormData) {
  const data = settingsSchema.parse({
    labelWidthMm: formData.get("labelWidthMm"),
    labelHeightMm: formData.get("labelHeightMm"),
    labelColumns: formData.get("labelColumns"),
    defaultTvaRate: formData.get("defaultTvaRate"),
    defaultMarginRate: formData.get("defaultMarginRate"),
  });

  await prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  revalidatePath("/reglages");
  revalidatePath("/etiquettes");
}
