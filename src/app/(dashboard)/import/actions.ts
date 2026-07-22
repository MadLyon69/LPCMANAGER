"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { priceVariationPct, sellPriceFromMargin } from "@/lib/pricing";
import { parsePdfInvoice, type PdfInvoiceRow } from "@/lib/pdfInvoice";

const importRowSchema = z.object({
  rawReference: z.string().trim().optional(),
  rawDesignation: z.string().trim().min(1),
  quantity: z.coerce.number(),
  purchasePriceHT: z.coerce.number().min(0),
  tvaRate: z.coerce.number().min(0).max(100).optional(),
});

export async function parsePdfInvoiceFile(formData: FormData): Promise<PdfInvoiceRow[]> {
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Aucun fichier fourni");
  const buffer = await file.arrayBuffer();
  return parsePdfInvoice(buffer);
}

export async function importInvoice(formData: FormData) {
  const supplierId = (formData.get("supplierId") as string) || undefined;
  const numero = (formData.get("numero") as string) || undefined;
  const fileName = (formData.get("fileName") as string) || undefined;
  const rowsRaw = formData.get("rows") as string;

  const rows = importRowSchema.array().min(1).parse(JSON.parse(rowsRaw));

  const references = rows
    .map((r) => r.rawReference?.trim().toLowerCase())
    .filter((r): r is string => !!r);

  const products = await prisma.product.findMany({
    where: { reference: { in: references.length > 0 ? references : ["__none__"] } },
  });
  const byRef = new Map(products.map((p) => [p.reference.trim().toLowerCase(), p]));

  const invoiceId = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: { supplierId, numero, fileName },
    });

    for (const row of rows) {
      const match = row.rawReference
        ? byRef.get(row.rawReference.trim().toLowerCase())
        : undefined;

      // Le prix/quantité de la facture sont exprimés par unité individuelle ;
      // on les convertit à l'unité de stock du produit (ex: prix par pack de 6)
      // pour rester cohérent avec purchasePriceHT/stockQuantity du produit.
      const effectiveQuantity = match ? row.quantity / match.unitsPerPackage : row.quantity;
      const effectivePurchasePriceHT = match
        ? row.purchasePriceHT * match.unitsPerPackage
        : row.purchasePriceHT;

      const variation = match
        ? priceVariationPct(match.purchasePriceHT, effectivePurchasePriceHT)
        : null;

      await tx.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          rawReference: row.rawReference,
          rawDesignation: row.rawDesignation,
          quantity: row.quantity,
          purchasePriceHT: row.purchasePriceHT,
          tvaRate: row.tvaRate ?? null,
          productId: match?.id,
          previousPriceHT: match?.purchasePriceHT ?? null,
          priceVariationPct: variation,
          resolved: !!match,
        },
      });

      if (match) {
        const newSellPriceTTC =
          match.priceMode === "MARGE_LIBRE"
            ? sellPriceFromMargin(effectivePurchasePriceHT, match.tvaRate, match.marginRate)
            : match.sellPriceTTC;

        const updated = await tx.product.update({
          where: { id: match.id },
          data: {
            purchasePriceHT: effectivePurchasePriceHT,
            sellPriceTTC: newSellPriceTTC,
            stockQuantity: match.stockQuantity + effectiveQuantity,
          },
        });

        await tx.priceHistory.create({
          data: {
            productId: match.id,
            purchasePriceHT: effectivePurchasePriceHT,
            sellPriceTTC: updated.sellPriceTTC,
            source: numero ? `facture ${numero}` : "facture",
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: match.id,
            type: "ENTREE_FACTURE",
            quantity: effectiveQuantity,
            note: fileName,
          },
        });

        byRef.set(match.reference.trim().toLowerCase(), updated);
      }
    }

    return invoice.id;
  });

  revalidatePath("/import");
  revalidatePath("/produits");
  revalidatePath("/etiquettes");
  revalidatePath("/");
  redirect(`/import/${invoiceId}`);
}

export async function resolveInvoiceLine(lineId: string, productId: string) {
  const line = await prisma.invoiceLine.findUniqueOrThrow({ where: { id: lineId } });
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const effectiveQuantity = line.quantity / product.unitsPerPackage;
  const effectivePurchasePriceHT = line.purchasePriceHT * product.unitsPerPackage;

  const variation = priceVariationPct(product.purchasePriceHT, effectivePurchasePriceHT);
  const newSellPriceTTC =
    product.priceMode === "MARGE_LIBRE"
      ? sellPriceFromMargin(effectivePurchasePriceHT, product.tvaRate, product.marginRate)
      : product.sellPriceTTC;

  await prisma.$transaction([
    prisma.invoiceLine.update({
      where: { id: lineId },
      data: {
        productId,
        resolved: true,
        previousPriceHT: product.purchasePriceHT,
        priceVariationPct: variation,
      },
    }),
    prisma.product.update({
      where: { id: productId },
      data: {
        purchasePriceHT: effectivePurchasePriceHT,
        sellPriceTTC: newSellPriceTTC,
        stockQuantity: product.stockQuantity + effectiveQuantity,
      },
    }),
    prisma.priceHistory.create({
      data: {
        productId,
        purchasePriceHT: effectivePurchasePriceHT,
        sellPriceTTC: newSellPriceTTC,
        source: "facture (résolution manuelle)",
      },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        type: "ENTREE_FACTURE",
        quantity: effectiveQuantity,
        note: "Résolution import",
      },
    }),
  ]);

  revalidatePath("/import");
  revalidatePath(`/produits/${productId}`);
  revalidatePath("/produits");
  revalidatePath("/etiquettes");
  revalidatePath("/");
}

export async function ignoreInvoiceLine(lineId: string) {
  await prisma.invoiceLine.update({
    where: { id: lineId },
    data: { resolved: true },
  });
  revalidatePath("/import");
  revalidatePath("/");
}

export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/import");
  revalidatePath("/");
}
