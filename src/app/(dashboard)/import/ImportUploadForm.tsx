"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { parseTabularFile, type ParsedTable } from "@/lib/fileParse";
import { parseLooseNumber } from "@/lib/parseNumber";
import { importInvoice, parsePdfInvoiceFile } from "./actions";
import type { PdfInvoiceRow } from "@/lib/pdfInvoice";

type Option = { id: string; nom: string };

type Mapping = {
  reference: string;
  designation: string;
  quantity: string;
  purchasePriceHT: string;
};

type NormalizedRow = {
  rawReference?: string;
  rawDesignation: string;
  quantity: number;
  purchasePriceHT: number;
  tvaRate?: number;
};

const NONE = "__none__";

export function ImportUploadForm({ suppliers }: { suppliers: Option[] }) {
  const formRef = useRef<HTMLFormElement>(null);

  const [table, setTable] = useState<ParsedTable | null>(null);
  const [pdfRows, setPdfRows] = useState<PdfInvoiceRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Mapping>({
    reference: NONE,
    designation: NONE,
    quantity: NONE,
    purchasePriceHT: NONE,
  });
  const [isParsingPdf, setIsParsingPdf] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setTable(null);
    setPdfRows(null);

    const isPdf = /\.pdf$/i.test(file.name) || file.type === "application/pdf";

    if (isPdf) {
      setIsParsingPdf(true);
      try {
        const formData = new FormData();
        formData.set("file", file);
        const rows = await parsePdfInvoiceFile(formData);
        if (rows.length === 0) {
          setError(
            "Aucune ligne produit détectée dans ce PDF. Le format de facture de ce fournisseur n'est peut-être pas encore pris en charge — vous pouvez aussi essayer un export CSV/Excel si votre fournisseur en propose un."
          );
        }
        setPdfRows(rows);
      } catch {
        setError(
          "Impossible d'analyser ce PDF (probablement un document scanné/image sans texte sélectionnable)."
        );
      } finally {
        setIsParsingPdf(false);
      }
      return;
    }

    try {
      const parsed = await parseTabularFile(file);
      setTable(parsed);

      const guess = (needle: string[]) =>
        parsed.headers.findIndex((h) =>
          needle.some((n) => h.toLowerCase().includes(n))
        );

      const refIdx = guess(["ref", "ean", "code", "gencod"]);
      const desigIdx = guess(["designation", "libelle", "description", "produit", "article"]);
      const qtyIdx = guess(["qte", "quantit", "qty"]);
      const priceIdx = guess(["prix", "pu ht", "p.u", "montant unitaire", "ht"]);

      setMapping({
        reference: refIdx >= 0 ? parsed.headers[refIdx] : NONE,
        designation: desigIdx >= 0 ? parsed.headers[desigIdx] : NONE,
        quantity: qtyIdx >= 0 ? parsed.headers[qtyIdx] : NONE,
        purchasePriceHT: priceIdx >= 0 ? parsed.headers[priceIdx] : NONE,
      });
    } catch {
      setError("Impossible de lire ce fichier. Formats supportés : CSV, XLSX, XLS, PDF.");
      setTable(null);
    }
  }

  const tableRows: NormalizedRow[] = useMemo(() => {
    if (!table) return [];
    const idx = (col: string) => table.headers.indexOf(col);
    const refI = mapping.reference !== NONE ? idx(mapping.reference) : -1;
    const desigI = mapping.designation !== NONE ? idx(mapping.designation) : -1;
    const qtyI = mapping.quantity !== NONE ? idx(mapping.quantity) : -1;
    const priceI = mapping.purchasePriceHT !== NONE ? idx(mapping.purchasePriceHT) : -1;

    return table.rows
      .filter((row) => row.some((cell) => cell && cell.trim() !== ""))
      .map((row) => ({
        rawReference: refI >= 0 ? row[refI]?.trim() : undefined,
        rawDesignation: desigI >= 0 ? row[desigI]?.trim() : (row[0] ?? "").trim(),
        quantity: qtyI >= 0 ? parseLooseNumber(row[qtyI]) : 1,
        purchasePriceHT: priceI >= 0 ? parseLooseNumber(row[priceI]) : 0,
      }))
      .filter((r) => r.rawDesignation);
  }, [table, mapping]);

  const normalizedRows: NormalizedRow[] = pdfRows
    ? pdfRows.map((r) => ({
        rawReference: r.rawReference,
        rawDesignation: r.rawDesignation,
        quantity: r.quantity,
        purchasePriceHT: r.purchasePriceHT,
        tvaRate: r.tvaRate ?? undefined,
      }))
    : tableRows;

  const hasTvaColumn = normalizedRows.some((r) => r.tvaRate != null);

  const canValidate = pdfRows
    ? pdfRows.length > 0
    : normalizedRows.length > 0 && mapping.designation !== NONE && mapping.purchasePriceHT !== NONE;

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    formData.set("rows", JSON.stringify(normalizedRows));
    formData.set("fileName", fileName);
    try {
      await importInvoice(formData);
    } catch {
      setError("Erreur lors de l'import. Vérifiez les données puis réessayez.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Fournisseur">
            <Select name="supplierId" form="import-form">
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Numéro de facture">
            <Input name="numero" form="import-form" />
          </Field>
          <Field label="Fichier (CSV, XLSX, PDF)">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </Field>
        </div>
        {isParsingPdf && (
          <p className="mt-3 text-sm text-gray-500">Analyse du PDF en cours…</p>
        )}
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {table && (
        <Card className="p-6">
          <p className="mb-4 text-sm font-semibold text-gray-900">
            Correspondance des colonnes
          </p>
          <div className="grid grid-cols-4 gap-4">
            <Field label="Référence / code-barres">
              <Select
                value={mapping.reference}
                onChange={(e) => setMapping((m) => ({ ...m, reference: e.target.value }))}
              >
                <option value={NONE}>— non mappé —</option>
                {table.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Désignation *">
              <Select
                value={mapping.designation}
                onChange={(e) => setMapping((m) => ({ ...m, designation: e.target.value }))}
              >
                <option value={NONE}>— non mappé —</option>
                {table.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantité">
              <Select
                value={mapping.quantity}
                onChange={(e) => setMapping((m) => ({ ...m, quantity: e.target.value }))}
              >
                <option value={NONE}>— défaut : 1 —</option>
                {table.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prix d'achat HT *">
              <Select
                value={mapping.purchasePriceHT}
                onChange={(e) =>
                  setMapping((m) => ({ ...m, purchasePriceHT: e.target.value }))
                }
              >
                <option value={NONE}>— non mappé —</option>
                {table.headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      )}

      {pdfRows && pdfRows.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {pdfRows.length} ligne(s) produit détectée(s) automatiquement dans le PDF.
          Vérifiez l&apos;aperçu ci-dessous avant de valider l&apos;import.
        </div>
      )}

      {normalizedRows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">
            Aperçu ({normalizedRows.length} ligne(s))
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Référence</th>
                <th className="px-4 py-2">Désignation</th>
                <th className="px-4 py-2">Qté</th>
                <th className="px-4 py-2">Prix HT</th>
                {hasTvaColumn && <th className="px-4 py-2">TVA</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {normalizedRows.slice(0, 20).map((r, i) => (
                <tr key={i}>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {r.rawReference || "—"}
                  </td>
                  <td className="px-4 py-2 text-gray-900">{r.rawDesignation}</td>
                  <td className="px-4 py-2 text-gray-600">{r.quantity}</td>
                  <td className="px-4 py-2 text-gray-600">{r.purchasePriceHT}</td>
                  {hasTvaColumn && (
                    <td className="px-4 py-2 text-gray-600">
                      {r.tvaRate != null ? `${r.tvaRate} %` : "—"}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {normalizedRows.length > 20 && (
            <div className="px-4 py-2 text-xs text-gray-400">
              … et {normalizedRows.length - 20} ligne(s) supplémentaire(s)
            </div>
          )}
        </Card>
      )}

      <form
        id="import-form"
        ref={formRef}
        action={handleSubmit}
        className="flex justify-end"
      >
        <Button type="submit" disabled={!canValidate || isSubmitting}>
          {isSubmitting ? "Import en cours..." : "Valider l'import"}
        </Button>
      </form>
    </div>
  );
}
