"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { deleteProduct } from "./actions";

export function DeleteProductButton({ id, designation }: { id: string; designation: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="danger"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`Supprimer le produit "${designation}" ?`)) return;
        startTransition(async () => {
          await deleteProduct(id);
          router.push("/produits");
        });
      }}
    >
      Supprimer le produit
    </Button>
  );
}
