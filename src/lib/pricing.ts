export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function purchasePriceTTC(purchasePriceHT: number, tvaRate: number): number {
  return round2(purchasePriceHT * (1 + tvaRate / 100));
}

/** Prix de vente TTC calculé à partir d'une marge appliquée sur le prix d'achat HT. */
export function sellPriceFromMargin(
  purchasePriceHT: number,
  tvaRate: number,
  marginRate: number
): number {
  const sellPriceHT = purchasePriceHT * (1 + marginRate / 100);
  return round2(sellPriceHT * (1 + tvaRate / 100));
}

/** Marge réelle (%) déduite d'un prix de vente TTC imposé, à titre indicatif. */
export function marginFromSellPrice(
  purchasePriceHT: number,
  tvaRate: number,
  sellPriceTTC: number
): number {
  if (purchasePriceHT <= 0) return 0;
  const sellPriceHT = sellPriceTTC / (1 + tvaRate / 100);
  return round2(((sellPriceHT - purchasePriceHT) / purchasePriceHT) * 100);
}

export function priceVariationPct(previous: number, current: number): number | null {
  if (!previous || previous <= 0) return null;
  return round2(((current - previous) / previous) * 100);
}

export function formatEUR(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
  }).format(value)} %`;
}
