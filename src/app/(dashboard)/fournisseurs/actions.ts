"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const supplierSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est obligatoire"),
  contact: z.string().trim().optional(),
  telephone: z.string().trim().optional(),
  email: z.string().trim().email("Email invalide").optional().or(z.literal("")),
  adresse: z.string().trim().optional(),
});

function parseSupplierForm(formData: FormData) {
  return supplierSchema.parse({
    nom: formData.get("nom"),
    contact: formData.get("contact") || undefined,
    telephone: formData.get("telephone") || undefined,
    email: formData.get("email") || undefined,
    adresse: formData.get("adresse") || undefined,
  });
}

export async function createSupplier(formData: FormData) {
  const data = parseSupplierForm(formData);
  await prisma.supplier.create({ data });
  revalidatePath("/fournisseurs");
  revalidatePath("/");
  redirect("/fournisseurs");
}

export async function updateSupplier(id: string, formData: FormData) {
  const data = parseSupplierForm(formData);
  await prisma.supplier.update({ where: { id }, data });
  revalidatePath("/fournisseurs");
  revalidatePath("/");
  redirect("/fournisseurs");
}

export async function deleteSupplier(id: string) {
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/fournisseurs");
  revalidatePath("/");
}
