import { Card } from "@/components/ui";
import { formatEUR, formatPct, priceVariationPct } from "@/lib/pricing";

type Entry = {
  id: string;
  purchasePriceHT: number;
  sellPriceTTC: number;
  source: string;
  date: Date;
};

export function PriceHistoryCard({ history }: { history: Entry[] }) {
  if (history.length === 0) {
    return (
      <Card className="p-6 text-sm text-gray-500">
        Aucun historique de prix pour ce produit.
      </Card>
    );
  }

  const sorted = [...history].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th className="px-4 py-2">Date</th>
            <th className="px-4 py-2">Prix d&apos;achat HT</th>
            <th className="px-4 py-2">Évolution</th>
            <th className="px-4 py-2">Prix de vente TTC</th>
            <th className="px-4 py-2">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((entry, i) => {
            const previous = sorted[i + 1];
            const variation = previous
              ? priceVariationPct(previous.purchasePriceHT, entry.purchasePriceHT)
              : null;
            return (
              <tr key={entry.id}>
                <td className="px-4 py-2 text-gray-600">
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(entry.date)}
                </td>
                <td className="px-4 py-2 font-medium text-gray-900">
                  {formatEUR(entry.purchasePriceHT)}
                </td>
                <td className="px-4 py-2">
                  {variation === null ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span
                      className={
                        variation > 0
                          ? "text-red-600"
                          : variation < 0
                            ? "text-green-600"
                            : "text-gray-500"
                      }
                    >
                      {formatPct(variation)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-gray-600">{formatEUR(entry.sellPriceTTC)}</td>
                <td className="px-4 py-2 text-gray-500">{entry.source}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
