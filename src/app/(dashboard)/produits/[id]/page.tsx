import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ProductForm } from "../ProductForm";
import { PriceHistoryCard } from "../PriceHistoryCard";
import { StockAdjustForm } from "../StockAdjustForm";
import { DeleteProductButton } from "../DeleteProductButton";
import { updateProduct } from "../actions";

export default async function EditProduitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories, suppliers] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { priceHistory: true },
    }),
    prisma.category.findMany({ orderBy: { nom: "asc" } }),
    prisma.supplier.findMany({ orderBy: { nom: "asc" } }),
  ]);

  if (!product) notFound();

  const action = updateProduct.bind(null, id);

  return (
    <div className="space-y-8">
      <PageHeader
        title={product.designation}
        description={`Référence : ${product.reference}`}
      />

      <ProductForm
        key={product.id}
        product={product}
        categories={categories}
        suppliers={suppliers}
        action={action}
      />

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900">Stock</p>
        <StockAdjustForm
          id={product.id}
          stockQuantity={product.stockQuantity}
          unit={product.unit}
        />
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900">Historique des prix d&apos;achat</p>
        <PriceHistoryCard history={product.priceHistory} />
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-6">
        <DeleteProductButton id={product.id} designation={product.designation} />
      </div>
    </div>
  );
}
