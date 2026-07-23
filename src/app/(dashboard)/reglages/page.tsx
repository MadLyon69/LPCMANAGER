import { getSettings } from "@/lib/settings";
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";
import { updateSettings } from "./actions";

export default async function ReglagesPage() {
  const settings = await getSettings();

  return (
    <div>
      <PageHeader
        title="Réglages"
        description="Paramètres par défaut utilisés dans l'application."
      />

      <Card className="max-w-xl p-6">
        <form action={updateSettings} className="space-y-6">
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900">
              Étiquettes prix (imprimante thermique)
            </p>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Largeur (mm)">
                <Input
                  name="labelWidthMm"
                  type="number"
                  step="0.1"
                  min="5"
                  defaultValue={settings.labelWidthMm}
                />
              </Field>
              <Field label="Hauteur (mm)">
                <Input
                  name="labelHeightMm"
                  type="number"
                  step="0.1"
                  min="5"
                  defaultValue={settings.labelHeightMm}
                />
              </Field>
              <Field label="Colonnes par page">
                <Input
                  name="labelColumns"
                  type="number"
                  step="1"
                  min="1"
                  defaultValue={settings.labelColumns}
                />
              </Field>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="mb-3 text-sm font-semibold text-gray-900">
              Valeurs par défaut nouveaux produits
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Taux de TVA par défaut (%)">
                <Input
                  name="defaultTvaRate"
                  type="number"
                  step="0.1"
                  defaultValue={settings.defaultTvaRate}
                />
              </Field>
              <Field label="Marge par défaut (%)">
                <Input
                  name="defaultMarginRate"
                  type="number"
                  step="0.1"
                  defaultValue={settings.defaultMarginRate}
                />
              </Field>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
