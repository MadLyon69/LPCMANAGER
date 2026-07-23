import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { SupplierForm } from "../SupplierForm";
import { updateSupplier } from "../actions";

export default async function EditFournisseurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();

  const action = updateSupplier.bind(null, id);

  return (
    <div>
      <PageHeader title={supplier.nom} description="Modifier le fournisseur" />
      <SupplierForm supplier={supplier} action={action} />
    </div>
  );
}
