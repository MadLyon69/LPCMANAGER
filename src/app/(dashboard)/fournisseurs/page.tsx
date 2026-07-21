import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { DeleteSupplierButton } from "./DeleteSupplierButton";

export default async function FournisseursPage() {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Fournisseurs"
        description="Gérez la liste de vos fournisseurs."
        action={
          <Link href="/fournisseurs/nouveau">
            <Button>+ Nouveau fournisseur</Button>
          </Link>
        }
      />

      {suppliers.length === 0 ? (
        <EmptyState
          title="Aucun fournisseur"
          description="Ajoutez votre premier fournisseur pour pouvoir l'associer à vos produits et factures."
          action={
            <Link href="/fournisseurs/nouveau">
              <Button>+ Nouveau fournisseur</Button>
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Produits</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link href={`/fournisseurs/${s.id}`}>{s.nom}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.contact || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.telephone || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{s.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{s._count.products}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/fournisseurs/${s.id}`}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900"
                      >
                        Modifier
                      </Link>
                      <DeleteSupplierButton id={s.id} nom={s.nom} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
