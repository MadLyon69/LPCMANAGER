"use client";

import { Button, Card, Field, Input } from "@/components/ui";

type Supplier = {
  id: string;
  nom: string;
  contact: string | null;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
};

export function SupplierForm({
  supplier,
  action,
}: {
  supplier?: Supplier;
  action: (formData: FormData) => void;
}) {
  return (
    <Card className="max-w-xl p-6">
      <form action={action} className="space-y-4">
        <Field label="Nom du fournisseur *">
          <Input name="nom" required defaultValue={supplier?.nom} />
        </Field>
        <Field label="Contact">
          <Input name="contact" defaultValue={supplier?.contact ?? ""} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Téléphone">
            <Input name="telephone" defaultValue={supplier?.telephone ?? ""} />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" defaultValue={supplier?.email ?? ""} />
          </Field>
        </div>
        <Field label="Adresse">
          <Input name="adresse" defaultValue={supplier?.adresse ?? ""} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit">{supplier ? "Enregistrer" : "Créer le fournisseur"}</Button>
        </div>
      </form>
    </Card>
  );
}
