"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sellPriceFromMargin, marginFromSellPrice } from "@/lib/pricing";

const productSchema = z.object({
  reference: z.string().trim().min(1, "La référence est obligatoire"),
  designation: z.string().trim().min(1, "La désignation est obligatoire"),
  categoryId: z.string().trim().optional(),
  supplierId: z.string().trim().optional(),
  purchasePriceHT: z.coerce.number().min(0),
  tvaRate: z.coerce.number().min(0).max(100),
  priceMode: z.enum(["MARGE_LIBRE", "PRIX_IMPOSE"]),
  marginRate: z.coerce.number(),
  sellPriceTTC: z.coerce.number().min(0),
  stockQuantity: z.coerce.number(),
  stockAlertSeuil: z.coerce.number().min(0),
  unit: z.string().trim().min(1),
  unitsPerPackage: z.coerce.number().min(1).default(1),
  contentValue: z.coerce.number().min(0).optional(),
  contentUnit: z.string().trim().optional(),
  actif: z.coerce.boolean().optional(),
});

function parseProductForm(formData: FormData) {
  const raw = {
    reference: formData.get("reference"),
    designation: formData.get("designation"),
    categoryId: formData.get("categoryId") || undefined,
    supplierId: formData.get("supplierId") || undefined,
    purchasePriceHT: formData.get("purchasePriceHT"),
    tvaRate: formData.get("tvaRate"),
    priceMode: formData.get("priceMode"),
    marginRate: formData.get("marginRate") || 0,
    sellPriceTTC: formData.get("sellPriceTTC"),
    stockQuantity: formData.get("stockQuantity") || 0,
    stockAlertSeuil: formData.get("stockAlertSeuil") || 0,
    unit: formData.get("unit") || "unite",
    unitsPerPackage: formData.get("unitsPerPackage") || 1,
    contentValue: formData.get("contentValue") || undefined,
    contentUnit: formData.get("contentUnit") || undefined,
    actif: formData.get("actif") ? true : false,
  };
  const parsed = productSchema.parse(raw);

  const sellPriceTTC =
    parsed.priceMode === "MARGE_LIBRE"
      ? sellPriceFromMargin(parsed.purchasePriceHT, parsed.tvaRate, parsed.marginRate)
      : parsed.sellPriceTTC;

  const marginRate =
    parsed.priceMode === "MARGE_LIBRE"
      ? parsed.marginRate
      : marginFromSellPrice(parsed.purchasePriceHT, parsed.tvaRate, parsed.sellPriceTTC);

  return {
    reference: parsed.reference,
    designation: parsed.designation,
    categoryId: parsed.categoryId || null,
    supplierId: parsed.supplierId || null,
    purchasePriceHT: parsed.purchasePriceHT,
    tvaRate: parsed.tvaRate,
    priceMode: parsed.priceMode,
    marginRate,
    sellPriceTTC,
    stockQuantity: parsed.stockQuantity,
    stockAlertSeuil: parsed.stockAlertSeuil,
    unit: parsed.unit,
    unitsPerPackage: parsed.unitsPerPackage,
    contentValue: parsed.contentUnit && parsed.contentValue ? parsed.contentValue : null,
    contentUnit: parsed.contentUnit || null,
    actif: parsed.actif ?? true,
  };
}

export async function createProduct(formData: FormData) {
  const data = parseProductForm(formData);
  const sourceLineId = (formData.get("sourceLineId") as string) || undefined;

  const product = await prisma.product.create({ data });

  await prisma.priceHistory.create({
    data: {
      productId: product.id,
      purchasePriceHT: product.purchasePriceHT,
      sellPriceTTC: product.sellPriceTTC,
      source: sourceLineId ? "facture (nouveau produit)" : "manuel",
    },
  });

  if (sourceLineId) {
    const line = await prisma.invoiceLine.findUnique({ where: { id: sourceLineId } });
    if (line) {
      const packQuantity = line.quantity / product.unitsPerPackage;
      await prisma.invoiceLine.update({
        where: { id: sourceLineId },
        data: { productId: product.id, resolved: true },
      });
      await prisma.product.update({
        where: { id: product.id },
        data: { stockQuantity: { increment: packQuantity } },
      });
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          type: "ENTREE_FACTURE",
          quantity: packQuantity,
          note: "Création depuis import facture",
        },
      });
    }
    revalidatePath("/import");
  }

  revalidatePath("/produits");
  revalidatePath("/etiquettes");
  revalidatePath("/");
  redirect(`/produits/${product.id}`);
}

export async function updateProduct(id: string, formData: FormData) {
  const data = parseProductForm(formData);

  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });

  await prisma.product.update({ where: { id }, data });

  if (
    existing.purchasePriceHT !== data.purchasePriceHT ||
    existing.sellPriceTTC !== data.sellPriceTTC
  ) {
    await prisma.priceHistory.create({
      data: {
        productId: id,
        purchasePriceHT: data.purchasePriceHT,
        sellPriceTTC: data.sellPriceTTC,
        source: "manuel",
      },
    });
  }

  revalidatePath("/produits");
  revalidatePath(`/produits/${id}`);
  revalidatePath("/etiquettes");
  revalidatePath("/");
  redirect(`/produits/${id}`);
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  revalidatePath("/produits");
  revalidatePath("/etiquettes");
  revalidatePath("/");
}

export async function adjustStock(id: string, delta: number, note?: string) {
  const product = await prisma.product.findUniqueOrThrow({ where: { id } });
  await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: { stockQuantity: product.stockQuantity + delta },
    }),
    prisma.stockMovement.create({
      data: {
        productId: id,
        type: "AJUSTEMENT",
        quantity: delta,
        note,
      },
    }),
  ]);
  revalidatePath(`/produits/${id}`);
  revalidatePath("/produits");
  revalidatePath("/");
}
