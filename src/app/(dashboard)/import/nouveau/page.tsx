import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui";
import { ImportUploadForm } from "../ImportUploadForm";

export default async function NouvelImportPage() {
  const suppliers = await prisma.supplier.findMany({ orderBy: { nom: "asc" } });

  return (
    <div>
      <PageHeader
        title="Importer une facture"
        description="Importez un fichier CSV ou Excel exporté depuis votre fournisseur."
      />
      <ImportUploadForm suppliers={suppliers} />
    </div>
  );
}
