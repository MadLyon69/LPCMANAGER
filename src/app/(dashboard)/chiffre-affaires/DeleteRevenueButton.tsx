"use client";

import { useTransition } from "react";
import { deleteRevenueEntry } from "./actions";

export function DeleteRevenueButton({ id, label }: { id: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Supprimer la saisie du ${label} ?`)) return;
        startTransition(async () => {
          await deleteRevenueEntry(id);
        });
      }}
    >
      Supprimer
    </button>
  );
}
