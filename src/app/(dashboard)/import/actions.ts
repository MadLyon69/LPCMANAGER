"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { priceVariationPct, sellPriceFromMargin } from "@/lib/pricing";

const importRowSchema = z.object({
  rawReference: z.string().trim().optional(),
  rawDesignation: z.string().trim().min(1),
  quantity: z.coerce.number(),
  purchasePriceHT: z.coerce.number().min(0),
});

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

      const variation = match
        ? priceVariationPct(match.purchasePriceHT, row.purchasePriceHT)
        : null;

      await tx.invoiceLine.create({
        data: {
          invoiceId: invoice.id,
          rawReference: row.rawReference,
          rawDesignation: row.rawDesignation,
          quantity: row.quantity,
          purchasePriceHT: row.purchasePriceHT,
          productId: match?.id,
          previousPriceHT: match?.purchasePriceHT ?? null,
          priceVariationPct: variation,
          resolved: !!match,
        },
      });

      if (match) {
        const newSellPriceTTC =
          match.priceMode === "MARGE_LIBRE"
            ? sellPriceFromMargin(row.purchasePriceHT, match.tvaRate, match.marginRate)
            : match.sellPriceTTC;

        const updated = await tx.product.update({
          where: { id: match.id },
          data: {
            purchasePriceHT: row.purchasePriceHT,
            sellPriceTTC: newSellPriceTTC,
            stockQuantity: match.stockQuantity + row.quantity,
          },
        });

        await tx.priceHistory.create({
          data: {
            productId: match.id,
            purchasePriceHT: row.purchasePriceHT,
            sellPriceTTC: updated.sellPriceTTC,
            source: numero ? `facture ${numero}` : "facture",
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: match.id,
            type: "ENTREE_FACTURE",
            quantity: row.quantity,
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

  const variation = priceVariationPct(product.purchasePriceHT, line.purchasePriceHT);
  const newSellPriceTTC =
    product.priceMode === "MARGE_LIBRE"
      ? sellPriceFromMargin(line.purchasePriceHT, product.tvaRate, product.marginRate)
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
        purchasePriceHT: line.purchasePriceHT,
        sellPriceTTC: newSellPriceTTC,
        stockQuantity: product.stockQuantity + line.quantity,
      },
    }),
    prisma.priceHistory.create({
      data: {
        productId,
        purchasePriceHT: line.purchasePriceHT,
        sellPriceTTC: newSellPriceTTC,
        source: "facture (résolution manuelle)",
      },
    }),
    prisma.stockMovement.create({
      data: {
        productId,
        type: "ENTREE_FACTURE",
        quantity: line.quantity,
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
