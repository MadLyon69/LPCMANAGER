"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { formatEUR } from "@/lib/pricing";

export type LabelItem = {
  key: string;
  reference: string;
  designation: string;
  priceTTC: number;
};

export function LabelSheet({
  items,
  widthMm,
  heightMm,
  columns,
}: {
  items: LabelItem[];
  widthMm: number;
  heightMm: number;
  columns: number;
}) {
  const svgRefs = useRef(new Map<string, SVGSVGElement>());

  useEffect(() => {
    for (const item of items) {
      const el = svgRefs.current.get(item.key);
      if (!el) continue;
      try {
        JsBarcode(el, item.reference, {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          height: 28,
        });
      } catch {
        // référence non encodable, on affiche l'étiquette sans code-barres
      }
    }
  }, [items]);

  return (
    <>
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {items.length} étiquette(s) · {widthMm}×{heightMm} mm
          </p>
          <p className="text-xs text-gray-500">
            Vérifiez le format papier de votre imprimante thermique avant impression.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/etiquettes"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Retour
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Imprimer
          </button>
        </div>
      </div>

      <style>{`
        @page { size: auto; margin: 4mm; }
        @media print {
          .label-grid { gap: 0 !important; }
        }
      `}</style>

      <div
        className="label-grid grid gap-2 p-6 print:p-0"
        style={{ gridTemplateColumns: `repeat(${columns}, ${widthMm}mm)` }}
      >
        {items.map((item) => (
          <div
            key={item.key}
            className="flex flex-col items-center justify-between overflow-hidden border border-gray-300 px-1 py-1 print:border-black"
            style={{ width: `${widthMm}mm`, height: `${heightMm}mm` }}
          >
            <p className="w-full truncate text-center text-[7px] leading-tight text-gray-800">
              {item.designation}
            </p>
            <p className="text-center text-[13px] font-bold leading-none text-gray-900">
              {formatEUR(item.priceTTC)}
            </p>
            <svg
              ref={(el) => {
                if (el) svgRefs.current.set(item.key, el);
              }}
              className="w-full"
              style={{ maxHeight: "8mm" }}
            />
          </div>
        ))}
      </div>
    </>
  );
}
