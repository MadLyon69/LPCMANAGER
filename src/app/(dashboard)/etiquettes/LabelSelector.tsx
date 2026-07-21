"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { formatEUR } from "@/lib/pricing";

type ProductRow = {
  id: string;
  reference: string;
  designation: string;
  sellPriceTTC: number;
  categoryNom: string | null;
};

export function LabelSelector({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.designation.toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q)
    );
  }, [products, search]);

  const selectedCount = Object.keys(selected).length;
  const totalLabels = Object.values(selected).reduce((a, b) => a + b, 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = 1;
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    setSelected((prev) => ({ ...prev, [id]: Math.max(1, qty) }));
  }

  function selectAllFiltered() {
    setSelected((prev) => {
      const next = { ...prev };
      for (const p of filtered) next[p.id] = next[p.id] ?? 1;
      return next;
    });
  }

  function clearAll() {
    setSelected({});
  }

  function handlePrint() {
    const items = Object.entries(selected)
      .map(([id, qty]) => `${id}:${qty}`)
      .join(",");
    router.push(`/etiquettes/imprimer?items=${encodeURIComponent(items)}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button type="button" variant="secondary" onClick={selectAllFiltered}>
          Tout sélectionner
        </Button>
        <Button type="button" variant="ghost" onClick={clearAll}>
          Aucun
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Désignation</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3">Prix TTC</th>
              <th className="px-4 py-3">Exemplaires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const checked = !!selected[p.id];
              return (
                <tr key={p.id} className={checked ? "bg-gray-50" : undefined}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500">
                    {p.reference}
                  </td>
                  <td className="px-4 py-2 text-gray-900">{p.designation}</td>
                  <td className="px-4 py-2 text-gray-600">{p.categoryNom ?? "—"}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {formatEUR(p.sellPriceTTC)}
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={1}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                      disabled={!checked}
                      value={selected[p.id] ?? 1}
                      onChange={(e) => setQty(p.id, Number(e.target.value))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3 shadow-sm">
        <p className="text-sm text-gray-600">
          {selectedCount} produit(s) sélectionné(s) · {totalLabels} étiquette(s)
        </p>
        <Button type="button" disabled={selectedCount === 0} onClick={handlePrint}>
          Générer les étiquettes
        </Button>
      </div>
    </div>
  );
}
