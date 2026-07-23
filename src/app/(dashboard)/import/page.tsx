import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";

export default async function ImportPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { importedAt: "desc" },
    include: {
      supplier: true,
      lines: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Import de factures"
        description="Historique des imports et détection des écarts de prix."
        action={
          <Link href="/import/nouveau">
            <Button>+ Nouvel import</Button>
          </Link>
        }
      />

      {invoices.length === 0 ? (
        <EmptyState
          title="Aucun import"
          description="Importez une facture fournisseur au format CSV ou Excel pour mettre à jour vos stocks et vos prix d'achat automatiquement."
          action={
            <Link href="/import/nouveau">
              <Button>+ Nouvel import</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Fichier</th>
                <th className="px-4 py-3">Lignes</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const unresolved = inv.lines.filter((l) => !l.resolved).length;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(inv.importedAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {inv.supplier?.nom ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {inv.fileName || inv.numero || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.lines.length}</td>
                    <td className="px-4 py-3">
                      {unresolved > 0 ? (
                        <Badge color="yellow">{unresolved} non référencé(s)</Badge>
                      ) : (
                        <Badge color="green">Complet</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/import/${inv.id}`}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900"
                      >
                        Voir le détail
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
