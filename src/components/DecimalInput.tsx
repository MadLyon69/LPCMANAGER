"use client";

import { useState } from "react";
import { Input } from "@/components/ui";
import { formatDecimalForEdit, parseDecimalInput } from "@/lib/decimal";

/**
 * Champ numérique acceptant indifféremment la virgule ou le point comme
 * séparateur décimal. Ne porte pas d'attribut `name` : associez-lui un
 * champ caché (`<input type="hidden" name="..." value={...} />`) pour la
 * soumission du formulaire, la valeur numérique étant toujours formatée
 * avec un point.
 */
export function DecimalInput({
  value,
  onValueChange,
  className,
  disabled,
}: {
  value: number;
  onValueChange: (n: number) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(() => formatDecimalForEdit(value));
  const [prevValue, setPrevValue] = useState(value);

  if (Math.abs(prevValue - value) > 1e-9) {
    setPrevValue(value);
    setText(formatDecimalForEdit(value));
  }

  return (
    <Input
      type="text"
      inputMode="decimal"
      className={className}
      disabled={disabled}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onValueChange(parseDecimalInput(e.target.value));
      }}
    />
  );
}
