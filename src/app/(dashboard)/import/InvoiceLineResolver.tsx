"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, Select } from "@/components/ui";
import { resolveInvoiceLine, ignoreInvoiceLine } from "./actions";

type ProductOption = { id: string; reference: string; designation: string };

export function InvoiceLineResolver({
  lineId,
  rawReference,
  rawDesignation,
  purchasePriceHT,
  tvaRate,
  products,
}: {
  lineId: string;
  rawReference?: string | null;
  rawDesignation: string;
  purchasePriceHT: number;
  tvaRate?: number | null;
  products: ProductOption[];
}) {
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();

  const newProductHref = `/produits/nouveau?reference=${encodeURIComponent(
    rawReference ?? ""
  )}&designation=${encodeURIComponent(rawDesignation)}&purchasePriceHT=${purchasePriceHT}${
    tvaRate != null ? `&tvaRate=${tvaRate}` : ""
  }&sourceLineId=${lineId}`;

  return (
    <div className="flex items-center gap-2">
      <Select
        className="w-56"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Associer à un produit existant…</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.designation} ({p.reference})
          </option>
        ))}
      </Select>
      <Button
        type="button"
        variant="secondary"
        disabled={!selected || isPending}
        onClick={() =>
          startTransition(async () => {
            await resolveInvoiceLine(lineId, selected);
          })
        }
      >
        Associer
      </Button>
      <Link href={newProductHref}>
        <Button type="button" variant="secondary">
          + Créer produit
        </Button>
      </Link>
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        onClick={() => startTransition(async () => { await ignoreInvoiceLine(lineId); })}
      >
        Ignorer
      </Button>
    </div>
  );
}
