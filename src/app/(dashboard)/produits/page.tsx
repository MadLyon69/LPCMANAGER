import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { formatEUR } from "@/lib/pricing";
import { Prisma } from "@/generated/prisma/client";

export default async function ProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const where: Prisma.ProductWhereInput = q
    ? {
        OR: [
          { designation: { contains: q } },
          { reference: { contains: q } },
        ],
      }
    : {};

  const products = await prisma.product.findMany({
    where,
    orderBy: { designation: "asc" },
    include: { category: true, supplier: true },
  });

  return (
    <div>
      <PageHeader
        title="Produits"
        description={`${products.length} produit(s) référencé(s)`}
        action={
          <Link href="/produits/nouveau">
            <Button>+ Nouveau produit</Button>
          </Link>
        }
      />

      <form className="mb-4" action="/produits">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher par désignation ou référence..."
          className="max-w-sm"
        />
      </form>

      {products.length === 0 ? (
        <EmptyState
          title="Aucun produit trouvé"
          description="Ajoutez un produit manuellement ou importez une facture fournisseur."
          action={
            <Link href="/produits/nouveau">
              <Button>+ Nouveau produit</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Désignation</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Achat HT</th>
                <th className="px-4 py-3">Vente TTC</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => {
                const lowStock = p.stockQuantity <= p.stockAlertSeuil;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {p.reference}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <Link href={`/produits/${p.id}`}>{p.designation}</Link>
                      {!p.actif && (
                        <span className="ml-2">
                          <Badge color="gray">inactif</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.category?.nom ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatEUR(p.purchasePriceHT)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatEUR(p.sellPriceTTC)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={lowStock ? "font-medium text-red-600" : "text-gray-600"}>
                        {p.stockQuantity} {p.unit}
                      </span>
                      {lowStock && (
                        <span className="ml-2">
                          <Badge color="red">stock bas</Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/produits/${p.id}`}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900"
                      >
                        Modifier
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
