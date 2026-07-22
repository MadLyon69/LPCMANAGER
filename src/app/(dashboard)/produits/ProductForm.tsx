"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
} from "@/components/ui";
import {
  formatEUR,
  marginFromSellPrice,
  purchasePriceTTC,
  sellPriceFromMargin,
} from "@/lib/pricing";

type Option = { id: string; nom: string };

type Product = {
  id: string;
  reference: string;
  designation: string;
  categoryId: string | null;
  supplierId: string | null;
  purchasePriceHT: number;
  tvaRate: number;
  priceMode: "MARGE_LIBRE" | "PRIX_IMPOSE";
  marginRate: number;
  sellPriceTTC: number;
  stockQuantity: number;
  stockAlertSeuil: number;
  unit: string;
  unitsPerPackage: number;
  actif: boolean;
};

const TVA_RATES = [20, 10, 5.5, 2.1];
const UNITS = ["unite", "paquet", "carton", "cartouche", "litre", "kg"];

type NewProductDefaults = {
  reference?: string;
  designation?: string;
  purchasePriceHT?: number;
  tvaRate?: number;
  sourceLineId?: string;
};

export function ProductForm({
  product,
  defaults,
  categories,
  suppliers,
  action,
}: {
  product?: Product;
  defaults?: NewProductDefaults;
  categories: Option[];
  suppliers: Option[];
  action: (formData: FormData) => void;
}) {
  const [purchaseHT, setPurchaseHT] = useState(
    product?.purchasePriceHT ?? defaults?.purchasePriceHT ?? 0
  );
  const [unitsPerPackage, setUnitsPerPackage] = useState(product?.unitsPerPackage ?? 1);
  const rawUnitPriceHT = defaults?.sourceLineId ? defaults?.purchasePriceHT : undefined;
  const [tvaRate, setTvaRate] = useState(product?.tvaRate ?? defaults?.tvaRate ?? 20);
  const [priceMode, setPriceMode] = useState<"MARGE_LIBRE" | "PRIX_IMPOSE">(
    product?.priceMode ?? "MARGE_LIBRE"
  );
  const [marginRate, setMarginRate] = useState(product?.marginRate ?? 30);
  const [sellTTC, setSellTTC] = useState(product?.sellPriceTTC ?? 0);

  const purchaseTTC = useMemo(
    () => purchasePriceTTC(purchaseHT, tvaRate),
    [purchaseHT, tvaRate]
  );

  const computedSellTTC =
    priceMode === "MARGE_LIBRE"
      ? sellPriceFromMargin(purchaseHT, tvaRate, marginRate)
      : sellTTC;

  const computedMargin =
    priceMode === "MARGE_LIBRE"
      ? marginRate
      : marginFromSellPrice(purchaseHT, tvaRate, sellTTC);

  return (
    <Card className="max-w-3xl p-6">
      <form action={action} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Référence / Code-barres *">
            <Input
              name="reference"
              required
              defaultValue={product?.reference ?? defaults?.reference}
            />
          </Field>
          <Field label="Désignation *">
            <Input
              name="designation"
              required
              defaultValue={product?.designation ?? defaults?.designation}
            />
          </Field>
        </div>
        {defaults?.sourceLineId && (
          <input type="hidden" name="sourceLineId" value={defaults.sourceLineId} />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Catégorie">
            <Select name="categoryId" defaultValue={product?.categoryId ?? ""}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fournisseur">
            <Select name="supplierId" defaultValue={product?.supplierId ?? ""}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-sm font-semibold text-gray-900">Prix &amp; TVA</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Prix d'achat HT (€) *">
              <Input
                name="purchasePriceHT"
                type="number"
                step="0.0001"
                min="0"
                required
                value={purchaseHT}
                onChange={(e) => setPurchaseHT(Number(e.target.value))}
              />
            </Field>
            <Field label="TVA (%)">
              <Input
                name="tvaRate"
                type="number"
                step="0.1"
                min="0"
                max="100"
                list="tva-rates"
                value={tvaRate}
                onChange={(e) => setTvaRate(Number(e.target.value))}
              />
              <datalist id="tva-rates">
                {TVA_RATES.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </Field>
            <Field label="Prix d'achat TTC">
              <Input value={formatEUR(purchaseTTC)} disabled />
            </Field>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-sm font-semibold text-gray-900">Mode de tarification</p>
          <div className="mb-4 flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="priceMode"
                value="MARGE_LIBRE"
                checked={priceMode === "MARGE_LIBRE"}
                onChange={() => setPriceMode("MARGE_LIBRE")}
              />
              Marge libre (épicerie)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="priceMode"
                value="PRIX_IMPOSE"
                checked={priceMode === "PRIX_IMPOSE"}
                onChange={() => setPriceMode("PRIX_IMPOSE")}
              />
              Prix imposé (tabac)
            </label>
          </div>

          {priceMode === "MARGE_LIBRE" ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Marge sur prix d'achat HT (%)">
                <Input
                  name="marginRate"
                  type="number"
                  step="0.1"
                  value={marginRate}
                  onChange={(e) => setMarginRate(Number(e.target.value))}
                />
              </Field>
              <Field label="Prix de vente TTC (calculé)">
                <Input value={formatEUR(computedSellTTC)} disabled />
                <input type="hidden" name="sellPriceTTC" value={computedSellTTC} />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prix de vente TTC imposé (€) *">
                <Input
                  name="sellPriceTTC"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sellTTC}
                  onChange={(e) => setSellTTC(Number(e.target.value))}
                />
              </Field>
              <Field label="Marge indicative (%)">
                <Input value={`${computedMargin.toFixed(2)} %`} disabled />
                <input type="hidden" name="marginRate" value={computedMargin} />
              </Field>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="mb-3 text-sm font-semibold text-gray-900">Stock</p>
          <div className="grid grid-cols-4 gap-4">
            <Field label="Quantité en stock">
              <Input
                name="stockQuantity"
                type="number"
                step="0.01"
                defaultValue={product?.stockQuantity ?? 0}
              />
            </Field>
            <Field label="Seuil d'alerte">
              <Input
                name="stockAlertSeuil"
                type="number"
                step="0.01"
                defaultValue={product?.stockAlertSeuil ?? 0}
              />
            </Field>
            <Field label="Unité">
              <Input name="unit" list="units" defaultValue={product?.unit ?? "unite"} />
              <datalist id="units">
                {UNITS.map((u) => (
                  <option key={u} value={u} />
                ))}
              </datalist>
            </Field>
            <Field
              label="Unités par pack (achat)"
              hint={
                rawUnitPriceHT != null
                  ? "Prix d'achat recalculé automatiquement ci-dessus."
                  : "Ex: 6 pour un pack de 6 bouteilles vendu comme un seul produit."
              }
            >
              <Input
                name="unitsPerPackage"
                type="number"
                step="1"
                min="1"
                value={unitsPerPackage}
                onChange={(e) => {
                  const n = Math.max(1, Number(e.target.value) || 1);
                  setUnitsPerPackage(n);
                  if (rawUnitPriceHT != null) {
                    setPurchaseHT(Math.round(rawUnitPriceHT * n * 10000) / 10000);
                  }
                }}
              />
            </Field>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="actif"
            defaultChecked={product?.actif ?? true}
          />
          Produit actif (visible en vente / étiquettes)
        </label>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="submit">{product ? "Enregistrer" : "Créer le produit"}</Button>
        </div>
      </form>
    </Card>
  );
}
