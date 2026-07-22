import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { upsertDailyRevenue } from "./actions";

export function RevenueForm({
  defaultDate,
  defaultAmount,
  defaultNote,
}: {
  defaultDate: string;
  defaultAmount?: number;
  defaultNote?: string | null;
}) {
  return (
    <Card className="p-6">
      <p className="mb-4 text-sm font-semibold text-gray-900">
        Saisir / corriger un chiffre d&apos;affaires journalier
      </p>
      <form action={upsertDailyRevenue} className="grid grid-cols-4 gap-4">
        <Field label="Date">
          <Input type="date" name="date" defaultValue={defaultDate} required />
        </Field>
        <Field label="CA TTC du jour (€)">
          <Input
            type="number"
            step="0.01"
            min="0"
            name="amountTTC"
            defaultValue={defaultAmount ?? ""}
            required
          />
        </Field>
        <div className="col-span-2">
          <Field label="Note (optionnel)">
            <Textarea name="note" rows={1} defaultValue={defaultNote ?? ""} />
          </Field>
        </div>
        <div className="col-span-4 flex justify-end">
          <Button type="submit">Enregistrer</Button>
        </div>
      </form>
    </Card>
  );
}
