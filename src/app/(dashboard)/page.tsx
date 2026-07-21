import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { formatEUR, formatPct } from "@/lib/pricing";

export default async function DashboardPage() {
  const [
    productCount,
    supplierCount,
    lowStockProducts,
    unresolvedLines,
    recentVariations,
    stockValueAgg,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.supplier.count(),
    prisma.product.findMany({
      where: { actif: true },
      orderBy: { stockQuantity: "asc" },
    }).then((rows) => rows.filter((p) => p.stockQuantity <= p.stockAlertSeuil).slice(0, 8)),
    prisma.invoiceLine.findMany({
      where: { resolved: false },
      include: { invoice: { include: { supplier: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.invoiceLine.findMany({
      where: { priceVariationPct: { not: null } },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.product.findMany({ select: { purchasePriceHT: true, stockQuantity: true } }),
  ]);

  const stockValue = stockValueAgg.reduce(
    (sum, p) => sum + p.purchasePriceHT * p.stockQuantity,
    0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre épicerie."
      />

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Produits référencés</p>
          <p className="text-2xl font-semibold text-gray-900">{productCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Fournisseurs</p>
          <p className="text-2xl font-semibold text-gray-900">{supplierCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Valeur du stock (achat HT)</p>
          <p className="text-2xl font-semibold text-gray-900">{formatEUR(stockValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Produits non référencés</p>
          <p className="text-2xl font-semibold text-yellow-600">{unresolvedLines.length}</p>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href="/produits/nouveau">
          <Button variant="secondary">+ Nouveau produit</Button>
        </Link>
        <Link href="/import/nouveau">
          <Button variant="secondary">+ Importer une facture</Button>
        </Link>
        <Link href="/etiquettes">
          <Button variant="secondary">🏷️ Imprimer des étiquettes</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900">Alertes stock bas</p>
          {lowStockProducts.length === 0 ? (
            <Card className="p-6 text-sm text-gray-500">Aucune alerte de stock.</Card>
          ) : (
            <Card className="divide-y divide-gray-100">
              {lowStockProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/produits/${p.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-900">{p.designation}</span>
                  <Badge color="red">
                    {p.stockQuantity} {p.unit}
                  </Badge>
                </Link>
              ))}
            </Card>
          )}
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900">
            Produits non référencés à traiter
          </p>
          {unresolvedLines.length === 0 ? (
            <Card className="p-6 text-sm text-gray-500">Rien à traiter.</Card>
          ) : (
            <Card className="divide-y divide-gray-100">
              {unresolvedLines.map((line) => (
                <Link
                  key={line.id}
                  href={`/import/${line.invoiceId}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-900">{line.rawDesignation}</span>
                  <span className="text-xs text-gray-500">
                    {line.invoice.supplier?.nom ?? "—"}
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900">
          Dernières variations de prix d&apos;achat
        </p>
        {recentVariations.length === 0 ? (
          <Card className="p-6 text-sm text-gray-500">
            Aucune variation détectée pour le moment.
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Produit</th>
                  <th className="px-4 py-2">Nouveau prix HT</th>
                  <th className="px-4 py-2">Évolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentVariations.map((line) => (
                  <tr key={line.id}>
                    <td className="px-4 py-2 text-gray-900">
                      {line.product ? (
                        <Link href={`/produits/${line.product.id}`}>
                          {line.product.designation}
                        </Link>
                      ) : (
                        line.rawDesignation
                      )}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {formatEUR(line.purchasePriceHT)}
                    </td>
                    <td className="px-4 py-2">
                      {line.priceVariationPct != null && (
                        <span
                          className={
                            line.priceVariationPct > 0
                              ? "text-red-600"
                              : line.priceVariationPct < 0
                                ? "text-green-600"
                                : "text-gray-500"
                          }
                        >
                          {formatPct(line.priceVariationPct)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
