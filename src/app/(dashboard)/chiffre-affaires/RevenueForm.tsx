"use client";

import { useState } from "react";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { DecimalInput } from "@/components/DecimalInput";

type Option = { id: string; nom: string };

type Entry = {
  periodType: "JOUR" | "MOIS";
  date: string;
  categoryId: string | null;
  tvaRate: number | null;
  amountTTC: number;
  note: string | null;
};

const TVA_OPTIONS = [20, 10, 5.5, 0];

function toDateInputValue(dateStr: string): string {
  return dateStr.slice(0, 10);
}

function toMonthInputValue(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function RevenueForm({
  entry,
  categories,
  action,
  todayStr,
}: {
  entry?: Entry;
  categories: Option[];
  action: (formData: FormData) => void;
  todayStr: string;
}) {
  const [periodType, setPeriodType] = useState<"JOUR" | "MOIS">(entry?.periodType ?? "JOUR");
  const [amountTTC, setAmountTTC] = useState(entry?.amountTTC ?? 0);

  return (
    <Card className="p-6">
      <p className="mb-4 text-sm font-semibold text-gray-900">
        {entry ? "Modifier une saisie" : "Ajouter une saisie de chiffre d'affaires"}
      </p>
      <form action={action} className="space-y-4">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="periodType"
              value="JOUR"
              checked={periodType === "JOUR"}
              onChange={() => setPeriodType("JOUR")}
            />
            Par jour
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="periodType"
              value="MOIS"
              checked={periodType === "MOIS"}
              onChange={() => setPeriodType("MOIS")}
            />
            Par mois (mois précédents)
          </label>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Field label={periodType === "JOUR" ? "Date" : "Mois"}>
            {periodType === "JOUR" ? (
              <Input
                type="date"
                name="date"
                defaultValue={entry ? toDateInputValue(entry.date) : todayStr}
                required
              />
            ) : (
              <Input
                type="month"
                name="date"
                defaultValue={entry ? toMonthInputValue(entry.date) : todayStr.slice(0, 7)}
                required
              />
            )}
          </Field>
          <Field label="Catégorie / famille" hint="Laisser vide pour un montant global">
            <Select name="categoryId" defaultValue={entry?.categoryId ?? ""}>
              <option value="">Toutes / non ventilé</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="TVA" hint="Laisser vide pour un montant global">
            <Select name="tvaRate" defaultValue={entry?.tvaRate?.toString() ?? ""}>
              <option value="">Toutes / non ventilé</option>
              {TVA_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.toString().replace(".", ",")} %
                </option>
              ))}
            </Select>
          </Field>
          <Field label="CA TTC (€)">
            <DecimalInput value={amountTTC} onValueChange={setAmountTTC} />
            <input type="hidden" name="amountTTC" value={amountTTC} required />
          </Field>
        </div>

        <Field label="Note (optionnel)">
          <Textarea name="note" rows={1} defaultValue={entry?.note ?? ""} />
        </Field>

        <div className="flex justify-end">
          <Button type="submit">{entry ? "Enregistrer" : "Ajouter"}</Button>
        </div>
      </form>
    </Card>
  );
}
