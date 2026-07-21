import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { LabelSelector } from "./LabelSelector";

export default async function EtiquettesPage() {
  const products = await prisma.product.findMany({
    where: { actif: true },
    orderBy: { designation: "asc" },
    include: { category: true },
  });

  const rows = products.map((p) => ({
    id: p.id,
    reference: p.reference,
    designation: p.designation,
    sellPriceTTC: p.sellPriceTTC,
    categoryNom: p.category?.nom ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Étiquettes prix"
        description="Sélectionnez les produits à étiqueter puis générez la planche à imprimer."
      />
      <LabelSelector products={rows} />
    </div>
  );
}
