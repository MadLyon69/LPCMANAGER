// pdfjs-dist référence `DOMMatrix` (API navigateur) au niveau racine
// d'un de ses modules internes (utilisé pour le rendu canvas, jamais
// exercé par notre usage texte seul). En environnement Node.js, cette
// référence n'existe pas et fait échouer le simple chargement du
// module — de façon incohérente selon l'environnement d'exécution
// (reproductible sur les fonctions serverless Vercel, pas toujours
// en local). On fournit un polyfill minimal avant tout chargement de
// pdfjs pour lever cette dépendance de façon fiable partout.
type Matrix6 = [number, number, number, number, number, number];

class DOMMatrixPolyfill {
  a = 1;
  b = 0;
  c = 0;
  d = 1;
  e = 0;
  f = 0;

  constructor(init?: Matrix6 | DOMMatrixPolyfill) {
    if (Array.isArray(init)) {
      if (init.length >= 6) [this.a, this.b, this.c, this.d, this.e, this.f] = init;
    } else if (init) {
      ({ a: this.a, b: this.b, c: this.c, d: this.d, e: this.e, f: this.f } = init);
    }
  }

  multiplySelf(other: DOMMatrixPolyfill) {
    const { a, b, c, d, e, f } = this;
    this.a = a * other.a + c * other.b;
    this.b = b * other.a + d * other.b;
    this.c = a * other.c + c * other.d;
    this.d = b * other.c + d * other.d;
    this.e = a * other.e + c * other.f + e;
    this.f = b * other.e + d * other.f + f;
    return this;
  }

  preMultiplySelf(other: DOMMatrixPolyfill) {
    const result = new DOMMatrixPolyfill(other).multiplySelf(this);
    ({ a: this.a, b: this.b, c: this.c, d: this.d, e: this.e, f: this.f } = result);
    return this;
  }

  translateSelf(tx = 0, ty = 0) {
    return this.multiplySelf(new DOMMatrixPolyfill([1, 0, 0, 1, tx, ty]));
  }

  translate(tx = 0, ty = 0) {
    return new DOMMatrixPolyfill(this).translateSelf(tx, ty);
  }

  scaleSelf(sx = 1, sy = sx) {
    return this.multiplySelf(new DOMMatrixPolyfill([sx, 0, 0, sy, 0, 0]));
  }

  scale(sx = 1, sy = sx) {
    return new DOMMatrixPolyfill(this).scaleSelf(sx, sy);
  }

  invertSelf() {
    const { a, b, c, d, e, f } = this;
    const det = a * d - b * c;
    this.a = d / det;
    this.b = -b / det;
    this.c = -c / det;
    this.d = a / det;
    this.e = -(this.a * e + this.c * f);
    this.f = -(this.b * e + this.d * f);
    return this;
  }
}

if (typeof (globalThis as { DOMMatrix?: unknown }).DOMMatrix === "undefined") {
  (globalThis as { DOMMatrix?: unknown }).DOMMatrix = DOMMatrixPolyfill;
}

// Import statique (effet de bord) : ce module assigne lui-même
// `globalThis.pdfjsWorker`, ce que pdfjs-dist utilise en priorité avant
// de tenter de résoudre dynamiquement le chemin du worker sur disque.
// Nécessaire car la résolution par chemin de fichier ne fonctionne pas
// une fois l'application packagée pour un déploiement serverless
// (ex: Vercel), où la disposition des fichiers diffère de l'environnement
// de développement local.
import "pdfjs-dist/legacy/build/pdf.worker.mjs";

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
 * METRO France : rapport colonnes EAN / numéro article / désignation,
 * colonnes variables selon la catégorie de produit, puis colisage /
 * quantité / montant / code TVA en fin de ligne. Le code TVA (lettre)
 * est résolu via le barème rappelé en bas de facture (ex: "B = 5,50%").
 */
function parseMetroLines(lines: string[]): PdfInvoiceRow[] {
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

const AUCHAN_STOP_PATTERNS = [
  /^\d+\s*\/\s*\d+\s*$/,
  /Votre commande/,
  /Votre facture/,
  /Id Waaoh/,
  /Référence/,
  /Caractéristiques produit/,
  /Prix U\./,
  /Remises U\./,
  /Taux TVA/,
  /Cagnotte/,
  /\(HT\)/,
  /\(TTC\)/,
  /^Total/,
  /Service Clients/,
  /code-barres/,
];

/**
 * Auchan Drive : Référence / désignation (parfois sur 2 lignes) / Prix U.
 * HT / Remise U. HT (optionnelle) / Qté / Prix total Net HT / Taux TVA /
 * Cagnotte Waaoh (optionnelle) / Prix total Net TTC.
 */
function parseAuchanLines(lines: string[]): PdfInvoiceRow[] {
  const lineRegex =
    /^\s*(\d{8,14})\s+(.+?)\s+(\d+,\d{2})\s+(?:(\d+,\d{2})\s+)?(\d+)\s+(\d+,\d{2})\s+(20,00|10,00|5,50|2,10|0,00)\s+(?:(\d+,\d{2})\s+)?(\d+,\d{2})\s*$/;

  const isStop = (line: string) => {
    const t = line.trim();
    if (!t) return true;
    return AUCHAN_STOP_PATTERNS.some((re) => re.test(t));
  };

  const rows: PdfInvoiceRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, "");
    const match = line.match(lineRegex);
    if (!match) continue;
    const [, ref, designationRaw, , , qte, prixTotalHT, tva] = match;

    let designation = designationRaw.trim();
    const next = lines[i + 1];
    if (next !== undefined && !isStop(next) && !next.match(lineRegex)) {
      designation += " " + next.trim();
    }
    if (!designation) continue;

    const qteN = parseInt(qte, 10);
    const montantN = parseFrenchNumber(prixTotalHT);
    if (!qteN || !montantN) continue;

    rows.push({
      rawReference: ref,
      rawDesignation: designation,
      quantity: qteN,
      purchasePriceHT: Math.round((montantN / qteN) * 10000) / 10000,
      tvaRate: parseFrenchNumber(tva),
    });
  }

  return rows;
}

const CARREFOUR_STOP_PATTERNS = [
  /^\d+\s*\/\s*\d+\s*$/,
  /Une question sur votre facture/,
  /Pour toutes demandes/,
  /commande, veuillez/,
  /client sur Carrefour/,
  /Rubrique Aide/,
  /Date de commande/,
  /Adresse de facturation/,
  /Date de livraison/,
  /Date de facturation/,
  /Merci de bien noter/,
  /facturés\. Les sacs/,
  /Merci pour votre commande/,
  /articles réceptionnés/,
  /^Qté/,
  /^Code EAN13/,
  /^Cdée/,
  /Nb sac\(s\)/,
  /La présente facture/,
  /Aucun escompte/,
  /non-respect de l'échéance/,
  /indemnité forfaitaire/,
  /Avertissement/,
  /SASU/,
  /^RCS :/,
  /Malgré tous les efforts/,
  /proposé des produits/,
];

/**
 * Carrefour (livraison/drive) : EAN13 / libellé (parfois avant ou après
 * la ligne de chiffres selon le nombre de lignes du libellé) / Qté
 * commandée / Qté livrée / TVA% / Prix Unit. HT / Prix Unit. TTC /
 * Remise TTC (optionnelle) / Montant TTC. La quantité retenue est la
 * quantité livrée, et le prix d'achat HT est déduit du montant TTC net
 * (après remise ligne) pour rester cohérent même en cas de remise.
 * La section récapitulative "articles indisponibles" en fin de facture
 * ne fait que reprendre des lignes déjà comptées : elle est ignorée.
 */
function parseCarrefourLines(lines: string[]): PdfInvoiceRow[] {
  const lineRegex =
    /^\s*(\d{8,14})\s*(.*?)\s+(\d+)\s+(\d+)\s+(\d+\.\d)\s+(\d+\.\d{2})\s+(\d+\.\d{2})\s+(?:(\d+\.\d{2})\s+)?(\d+\.\d{2})\s*$/;

  const isStop = (line: string) => {
    const t = line.trim();
    if (!t) return true;
    return CARREFOUR_STOP_PATTERNS.some((re) => re.test(t));
  };

  const rows: PdfInvoiceRow[] = [];
  let stopped = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, "");
    if (/articles étaient indisponibles/.test(line)) {
      stopped = true;
    }
    if (stopped) continue;

    const match = line.match(lineRegex);
    if (!match) continue;
    const [, ean, designationInline, , qteLivree, tva, , , , montantTTC] = match;

    const qteN = parseInt(qteLivree, 10);
    const montantN = parseFloat(montantTTC);
    if (!qteN || !montantN) continue;

    let designation = designationInline.trim();
    if (!designation) {
      const prev = lines[i - 1];
      if (prev !== undefined && !isStop(prev) && !prev.match(lineRegex)) {
        designation = prev.trim();
      }
      const next = lines[i + 1];
      if (next !== undefined && !isStop(next) && !next.match(lineRegex)) {
        designation = (designation + " " + next.trim()).trim();
      }
    }
    if (!designation) continue;

    const tvaRate = parseFrenchNumber(tva);
    const montantHT = montantN / (1 + tvaRate / 100);

    rows.push({
      rawReference: ean,
      rawDesignation: designation,
      quantity: qteN,
      purchasePriceHT: Math.round((montantHT / qteN) * 10000) / 10000,
      tvaRate,
    });
  }

  return rows;
}

type SupplierFormat = "metro" | "auchan" | "carrefour";

function detectFormat(fullText: string): SupplierFormat | null {
  if (/METRO France|Numéro Agrément Sanitaire|PRIX AU KG OU AU LITRE/i.test(fullText)) {
    return "metro";
  }
  if (/AUCHAN|Waaoh/i.test(fullText)) {
    return "auchan";
  }
  if (/Carrefour|Code EAN13/i.test(fullText)) {
    return "carrefour";
  }
  return null;
}

const PARSERS: Record<SupplierFormat, (lines: string[]) => PdfInvoiceRow[]> = {
  metro: parseMetroLines,
  auchan: parseAuchanLines,
  carrefour: parseCarrefourLines,
};

export async function parsePdfInvoice(buffer: ArrayBuffer): Promise<PdfInvoiceRow[]> {
  const lines = await extractPdfLines(buffer);
  const fullText = lines.join("\n");

  const detected = detectFormat(fullText);
  if (detected) {
    const rows = PARSERS[detected](lines);
    if (rows.length > 0) return rows;
  }

  // Format non détecté avec certitude (ou échec) : on tente chaque
  // parseur connu et on retient celui qui produit le plus de lignes.
  let best: PdfInvoiceRow[] = [];
  for (const parser of Object.values(PARSERS)) {
    const rows = parser(lines);
    if (rows.length > best.length) best = rows;
  }
  return best;
}
