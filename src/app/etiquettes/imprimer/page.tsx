import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { unitPriceLabel } from "@/lib/pricing";
import { LabelSheet, type LabelItem } from "./LabelSheet";

function parseItems(raw: string | undefined): Array<{ id: string; qty: number }> {
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => {
      const [id, qty] = part.split(":");
      return { id, qty: Math.max(1, Number(qty) || 1) };
    })
    .filter((x) => x.id);
}

export default async function ImprimerEtiquettesPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string }>;
}) {
  const { items } = await searchParams;
  const selection = parseItems(items);

  const products = await prisma.product.findMany({
    where: { id: { in: selection.map((s) => s.id) } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const settings = await getSettings();

  const labels: LabelItem[] = selection.flatMap(({ id, qty }) => {
    const product = byId.get(id);
    if (!product) return [];
    const unitPrice = unitPriceLabel(
      product.sellPriceTTC,
      product.contentValue,
      product.contentUnit
    );
    return Array.from({ length: qty }, (_, i) => ({
      key: `${id}-${i}`,
      reference: product.reference,
      designation: product.designation,
      priceTTC: product.sellPriceTTC,
      unitPrice,
    }));
  });

  return (
    <LabelSheet
      items={labels}
      widthMm={settings.labelWidthMm}
      heightMm={settings.labelHeightMm}
      columns={settings.labelColumns}
    />
  );
}
