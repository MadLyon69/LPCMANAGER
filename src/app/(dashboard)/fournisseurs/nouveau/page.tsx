import { PageHeader } from "@/components/ui";
import { SupplierForm } from "../SupplierForm";
import { createSupplier } from "../actions";

export default function NouveauFournisseurPage() {
  return (
    <div>
      <PageHeader title="Nouveau fournisseur" />
      <SupplierForm action={createSupplier} />
    </div>
  );
}
