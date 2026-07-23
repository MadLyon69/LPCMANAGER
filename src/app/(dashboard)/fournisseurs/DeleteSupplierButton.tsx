"use client";

import { useTransition } from "react";
import { deleteSupplier } from "./actions";

export function DeleteSupplierButton({ id, nom }: { id: string; nom: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
      onClick={() => {
        if (!confirm(`Supprimer le fournisseur "${nom}" ?`)) return;
        startTransition(async () => {
          try {
            await deleteSupplier(id);
          } catch {
            alert("Impossible de supprimer ce fournisseur.");
          }
        });
      }}
    >
      Supprimer
    </button>
  );
}
