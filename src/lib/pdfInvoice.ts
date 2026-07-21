import path from "path";
import { pathToFileURL } from "url";

export type PdfInvoiceRow = {
  rawReference: string;
  rawDesignation: string;
  quantity: number;
  purchasePriceHT: number;
  tvaRate: number | null;
};

function parseFrenchNumber(s: string): number {
  return parseFloat(s.replace(/\s/g, "").replace(",", "."));
}

async function extractPdfLines(buffer: ArrayBuffer): Promise<string[]> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const workerPath = path.join(
    process.cwd(),
    "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
  }).promise;

  const allLines: string[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items
      .filter(
        (it): it is typeof it & { str: string; transform: number[]; width: number } =>
          "str" in it && (it as { str: string }).str.trim() !== ""
      )
      .map((it) => ({
        str: it.str,
        x: it.transform[4],
        y: Math.round(it.transform[5] * 10) / 10,
        w: it.width,
      }));

    const lines = new Map<number, typeof items>();
    for (const it of items) {
      let key = [...lines.keys()].find((k) => Math.abs(k - it.y) < 2);
      if (key === undefined) key = it.y;
      if (!lines.has(key)) lines.set(key, []);
      lines.get(key)!.push(it);
    }

    const sortedYs = [...lines.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const rowItems = lines.get(y)!.sort((a, b) => a.x - b.x);
      let line = "";
      let lastEnd: number | null = null;
      for (const it of rowItems) {
        if (lastEnd !== null) {
          const gap = it.x - lastEnd;
          const spaces = Math.max(1, Math.round(gap / 4));
          line += " ".repeat(Math.min(spaces, 20));
        }
        line += it.str;
        lastEnd = it.x + it.w;
      }
      allLines.push(line);
    }
  }

  return allLines;
}

/**
 * Parseur pour les factures fournisseur au format "rapport colonnes"
 * (ex: METRO France) : EAN, numéro article, désignation, colonnes
 * variables selon la catégorie de produit, puis colisage/quantité/
 * montant/code TVA en fin de ligne. Le code TVA (lettre) est résolu via
 * le barème rappelé en bas de facture (ex: "B = 5,50%", "D = 20,00%").
 */
function parseColumnarInvoiceLines(lines: string[]): PdfInvoiceRow[] {
  const fullText = lines.join("\n");

  const tvaMap: Record<string, number> = {};
  const tvaMapRegex = /\b([A-Z])\s*=\s*(\d+,\d+)\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = tvaMapRegex.exec(fullText))) {
    tvaMap[m[1]] = parseFrenchNumber(m[2]);
  }

  const lineRegex =
    /^\s*(?:(\d{6,14})|M)\s+(\d{4,8})\s+(.+?)\s+(\d{1,4})\s+(\d{1,4})\s+(\d+,\d{2})\s+([A-Z])(?:\s+P)?(?:\s+\S+)?\s*$/;

  const rows: PdfInvoiceRow[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const match = line.match(lineRegex);
    if (!match) continue;
    const [, ean, numero, designationRaw, colisage, qte, montant, tva] = match;

    const designation = designationRaw
      .replace(/\s+([A-Z]\s+)?(\d+,\d+\s*){1,4}$/, "")
      .trim();
    if (!designation) continue;

    const colisageN = parseInt(colisage, 10);
    const qteN = parseInt(qte, 10);
    const montantN = parseFrenchNumber(montant);
    const quantity = colisageN * qteN;
    if (!quantity || !montantN) continue;

    rows.push({
      rawReference: ean || numero,
      rawDesignation: designation,
      quantity,
      purchasePriceHT: Math.round((montantN / quantity) * 10000) / 10000,
      tvaRate: tvaMap[tva] ?? null,
    });
  }

  return rows;
}

export async function parsePdfInvoice(buffer: ArrayBuffer): Promise<PdfInvoiceRow[]> {
  const lines = await extractPdfLines(buffer);
  return parseColumnarInvoiceLines(lines);
}
