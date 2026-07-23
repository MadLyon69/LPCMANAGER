import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatEUR, formatPct } from "@/lib/pricing";
import { InvoiceLineResolver } from "../InvoiceLineResolver";

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, products] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        lines: { include: { product: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.product.findMany({
      select: { id: true, reference: true, designation: true },
      orderBy: { designation: "asc" },
    }),
  ]);

  if (!invoice) notFound();

  const unresolvedLines = invoice.lines.filter((l) => !l.resolved);
  const resolvedLines = invoice.lines.filter((l) => l.resolved);
  const priceIncreases = resolvedLines.filter(
    (l) => l.priceVariationPct != null && l.priceVariationPct > 0
  );
  const priceDecreases = resolvedLines.filter(
    (l) => l.priceVariationPct != null && l.priceVariationPct < 0
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={invoice.fileName || invoice.numero || "Import"}
        description={`${invoice.supplier?.nom ?? "Fournisseur inconnu"} · ${new Intl.DateTimeFormat(
          "fr-FR",
          { dateStyle: "long", timeStyle: "short" }
        ).format(invoice.importedAt)}`}
      />

      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Lignes importées</p>
          <p className="text-2xl font-semibold text-gray-900">{invoice.lines.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Non référencés</p>
          <p className="text-2xl font-semibold text-yellow-600">{unresolvedLines.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Hausses de prix</p>
          <p className="text-2xl font-semibold text-red-600">{priceIncreases.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Baisses de prix</p>
          <p className="text-2xl font-semibold text-green-600">{priceDecreases.length}</p>
        </Card>
      </div>

      {unresolvedLines.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-900">
            Produits non référencés ({unresolvedLines.length})
          </p>
          <Card className="divide-y divide-gray-100">
            {unresolvedLines.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{line.rawDesignation}</p>
                  <p className="text-xs text-gray-500">
                    Réf. {line.rawReference || "—"} · Qté {line.quantity} · Prix HT{" "}
                    {formatEUR(line.purchasePriceHT)}
                  </p>
                </div>
                <InvoiceLineResolver
                  lineId={line.id}
                  rawReference={line.rawReference}
                  rawDesignation={line.rawDesignation}
                  purchasePriceHT={line.purchasePriceHT}
                  tvaRate={line.tvaRate}
                  products={products}
                />
              </div>
            ))}
          </Card>
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-semibold text-gray-900">Toutes les lignes</p>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Référence</th>
                <th className="px-4 py-2">Désignation</th>
                <th className="px-4 py-2">Qté</th>
                <th className="px-4 py-2">Prix HT</th>
                <th className="px-4 py-2">Évolution</th>
                <th className="px-4 py-2">Produit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.lines.map((line) => (
                <tr key={line.id}>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {line.rawReference || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-900">{line.rawDesignation}</td>
                  <td className="px-4 py-2 text-gray-600">{line.quantity}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {formatEUR(line.purchasePriceHT)}
                  </td>
                  <td className="px-4 py-2">
                    {line.priceVariationPct == null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
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
                  <td className="px-4 py-2">
                    {line.product ? (
                      <Link
                        href={`/produits/${line.product.id}`}
                        className="text-gray-700 hover:text-gray-900"
                      >
                        {line.product.designation}
                      </Link>
                    ) : (
                      <Badge color="yellow">Non référencé</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
