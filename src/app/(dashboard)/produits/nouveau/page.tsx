import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "../ProductForm";
import { createProduct } from "../actions";

export default async function NouveauProduitPage({
  searchParams,
}: {
  searchParams: Promise<{
    reference?: string;
    designation?: string;
    purchasePriceHT?: string;
    tvaRate?: string;
    sourceLineId?: string;
  }>;
}) {
  const params = await searchParams;
  const [categories, suppliers] = await Promise.all([
    prisma.category.findMany({ orderBy: { nom: "asc" } }),
    prisma.supplier.findMany({ orderBy: { nom: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader title="Nouveau produit" />
      <ProductForm
        key={params.sourceLineId ?? "new"}
        categories={categories}
        suppliers={suppliers}
        action={createProduct}
        defaults={{
          reference: params.reference,
          designation: params.designation,
          purchasePriceHT: params.purchasePriceHT
            ? Number(params.purchasePriceHT)
            : undefined,
          tvaRate: params.tvaRate ? Number(params.tvaRate) : undefined,
          sourceLineId: params.sourceLineId,
        }}
      />
    </div>
  );
}
