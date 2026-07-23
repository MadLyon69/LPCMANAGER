/** Parse une saisie utilisateur en acceptant la virgule ou le point comme séparateur décimal. */
export function parseDecimalInput(value: string): number {
  const normalized = value.replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export function formatDecimalForEdit(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(value);
}
