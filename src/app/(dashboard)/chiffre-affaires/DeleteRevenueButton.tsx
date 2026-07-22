"use client";

import { useTransition } from "react";
import { deleteDailyRevenue } from "./actions";

export function DeleteRevenueButton({ id, dateLabel }: { id: string; dateLabel: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Supprimer la saisie du ${dateLabel} ?`)) return;
        startTransition(async () => {
          await deleteDailyRevenue(id);
        });
      }}
    >
      Supprimer
    </button>
  );
}
