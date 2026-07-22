"use client";

import { useState } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  Select,
} from "@/components/ui";
import { DecimalInput } from "@/components/DecimalInput";
import {
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

const TVA_RATES = [20, 10, 5.5, 0];
const UNITS = ["unite", "paquet", "carton", "cartouche", "litre", "kg"];

type NewProductDefaults = {
  reference?: string;
  designation?: string;
  purchasePriceHT?: number;
  tvaRate?: number;
  sourceLineId?: string;
};

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

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
  const rawUnitPriceHT = defaults?.sourceLineId ? defaults?.purchasePriceHT : undefined;

  const initialPurchaseHT = product?.purchasePriceHT ?? defaults?.purchasePriceHT ?? 0;
  const initialTva = product?.tvaRate ?? defaults?.tvaRate ?? 20;
  const initialMode = product?.priceMode ?? "MARGE_LIBRE";
  const initialMargin = product?.marginRate ?? 30;
  const initialSellTTC =
    product?.sellPriceTTC ??
    (initialMode === "MARGE_LIBRE"
      ? sellPriceFromMargin(initialPurchaseHT, initialTva, initialMargin)
      : 0);

  const [purchaseHT, setPurchaseHT] = useState(initialPurchaseHT);
  const [purchaseTTC, setPurchaseTTC] = useState(
    purchasePriceTTC(initialPurchaseHT, initialTva)
  );
  const [tvaRate, setTvaRate] = useState(initialTva);
  const [priceMode, setPriceMode] = useState<"MARGE_LIBRE" | "PRIX_IMPOSE">(initialMode);
  const [marginRate, setMarginRate] = useState(initialMargin);
  const [sellTTC, setSellTTC] = useState(initialSellTTC);
  const [unitsPerPackage, setUnitsPerPackage] = useState(product?.unitsPerPackage ?? 1);
  const [stockQuantity, setStockQuantity] = useState(product?.stockQuantity ?? 0);
  const [stockAlertSeuil, setStockAlertSeuil] = useState(product?.stockAlertSeuil ?? 0);

  const computedMargin =
    priceMode === "PRIX_IMPOSE" ? marginFromSellPrice(purchaseHT, tvaRate, sellTTC) : marginRate;

  function applyPurchaseHT(newHT: number) {
    setPurchaseHT(newHT);
    setPurchaseTTC(purchasePriceTTC(newHT, tvaRate));
    if (priceMode === "MARGE_LIBRE") {
      setSellTTC(sellPriceFromMargin(newHT, tvaRate, marginRate));
    }
  }

  function handlePurchaseTTCChange(newTTC: number) {
    setPurchaseTTC(newTTC);
    const newHT = round4(newTTC / (1 + tvaRate / 100));
    setPurchaseHT(newHT);
    if (priceMode === "MARGE_LIBRE") {
      setSellTTC(sellPriceFromMargin(newHT, tvaRate, marginRate));
    }
  }

  function handleTvaChange(newTva: number) {
    setTvaRate(newTva);
    setPurchaseTTC(purchasePriceTTC(purchaseHT, newTva));
    if (priceMode === "MARGE_LIBRE") {
      setSellTTC(sellPriceFromMargin(purchaseHT, newTva, marginRate));
    }
  }

  function handleMarginChange(newMargin: number) {
    setMarginRate(newMargin);
    setSellTTC(sellPriceFromMargin(purchaseHT, tvaRate, newMargin));
  }

  function handleSellTTCChange(newSell: number) {
    setSellTTC(newSell);
    if (priceMode === "MARGE_LIBRE") {
      setMarginRate(marginFromSellPrice(purchaseHT, tvaRate, newSell));
    }
  }

  function handleUnitsPerPackageChange(n: number) {
    const clamped = Math.max(1, n || 1);
    setUnitsPerPackage(clamped);
    if (rawUnitPriceHT != null) {
      applyPurchaseHT(round4(rawUnitPriceHT * clamped));
    }
  }

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
              <DecimalInput value={purchaseHT} onValueChange={applyPurchaseHT} />
              <input type="hidden" name="purchasePriceHT" value={purchaseHT} required />
            </Field>
            <Field label="TVA (%)">
              <Select
                name="tvaRate"
                value={tvaRate}
                onChange={(e) => handleTvaChange(Number(e.target.value))}
              >
                {TVA_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r.toString().replace(".", ",")} %
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Prix d'achat TTC (€)" hint="Modifiable : recalcule le HT.">
              <DecimalInput value={purchaseTTC} onValueChange={handlePurchaseTTCChange} />
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
                <DecimalInput value={marginRate} onValueChange={handleMarginChange} />
                <input type="hidden" name="marginRate" value={marginRate} />
              </Field>
              <Field label="Prix de vente TTC (€)" hint="Modifiable : recalcule la marge.">
                <DecimalInput value={sellTTC} onValueChange={handleSellTTCChange} />
                <input type="hidden" name="sellPriceTTC" value={sellTTC} />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prix de vente TTC imposé (€) *">
                <DecimalInput value={sellTTC} onValueChange={handleSellTTCChange} />
                <input type="hidden" name="sellPriceTTC" value={sellTTC} required />
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
              <DecimalInput value={stockQuantity} onValueChange={setStockQuantity} />
              <input type="hidden" name="stockQuantity" value={stockQuantity} />
            </Field>
            <Field label="Seuil d'alerte">
              <DecimalInput value={stockAlertSeuil} onValueChange={setStockAlertSeuil} />
              <input type="hidden" name="stockAlertSeuil" value={stockAlertSeuil} />
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
              <DecimalInput value={unitsPerPackage} onValueChange={handleUnitsPerPackageChange} />
              <input type="hidden" name="unitsPerPackage" value={unitsPerPackage} />
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
