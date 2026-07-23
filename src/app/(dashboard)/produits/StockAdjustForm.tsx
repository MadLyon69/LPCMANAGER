"use client";

import { useRef, useTransition } from "react";
import { Button, Card, Input } from "@/components/ui";
import { adjustStock } from "./actions";

export function StockAdjustForm({
  id,
  stockQuantity,
  unit,
}: {
  id: string;
  stockQuantity: number;
  unit: string;
}) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Card className="p-6">
      <p className="mb-1 text-sm font-semibold text-gray-900">Ajustement de stock</p>
      <p className="mb-4 text-sm text-gray-500">
        Stock actuel : <span className="font-medium text-gray-900">{stockQuantity}</span>{" "}
        {unit}
      </p>
      <form
        ref={formRef}
        className="flex items-end gap-3"
        action={(formData) => {
          const delta = Number(formData.get("delta") || 0);
          const note = String(formData.get("note") || "");
          if (!delta) return;
          startTransition(async () => {
            await adjustStock(id, delta, note || undefined);
            formRef.current?.reset();
          });
        }}
      >
        <div className="w-32">
          <Input name="delta" type="number" step="0.01" placeholder="+/- quantité" />
        </div>
        <div className="flex-1">
          <Input name="note" placeholder="Motif (optionnel)" />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          Appliquer
        </Button>
      </form>
    </Card>
  );
}
