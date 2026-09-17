"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LOAD_PRODUCT_UNITS,
  LOAD_PRODUCT_UNIT_LABELS,
  suggestLoadProductQuantity,
  type LoadProductUnit,
} from "@/lib/spray-executions/calculations";
import type { DoseUnit } from "@/lib/spray-orders/constants";
import type { ProductItem } from "@/lib/masters/products";

export interface LoadProductRow {
  key: string;
  productId: string;
  quantityValue: string;
  quantityUnit: LoadProductUnit;
}

export function newLoadProductRow(defaultUnit: LoadProductUnit = "l"): LoadProductRow {
  return { key: crypto.randomUUID(), productId: "", quantityValue: "", quantityUnit: defaultUnit };
}

export function LoadProductEditor({
  products,
  recipeByProductId,
  rows,
  onChange,
  waterLiters,
  targetSprayVolumePerHa,
}: {
  products: ProductItem[];
  recipeByProductId: Map<string, { doseValue: number; doseUnit: DoseUnit }>;
  rows: LoadProductRow[];
  onChange: (rows: LoadProductRow[]) => void;
  waterLiters: number;
  targetSprayVolumePerHa: number | null;
}) {
  function updateRow(key: string, patch: Partial<LoadProductRow>) {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    onChange(rows.filter((r) => r.key !== key));
  }

  const productItems = products.map((p) => ({ value: p.id, label: p.name }));
  const unitItems = LOAD_PRODUCT_UNITS.map((u) => ({ value: u, label: LOAD_PRODUCT_UNIT_LABELS[u] }));

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => {
        const recipe = row.productId ? recipeByProductId.get(row.productId) : undefined;
        const suggestion =
          recipe && waterLiters > 0
            ? suggestLoadProductQuantity(waterLiters, targetSprayVolumePerHa, recipe.doseValue, recipe.doseUnit)
            : null;
        const inRecipe = row.productId ? recipeByProductId.has(row.productId) : true;

        return (
          <div key={row.key} className="rounded-lg border p-3">
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Label>Producto</Label>
                  {row.productId && !inRecipe ? (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      No estaba en la receta
                    </Badge>
                  ) : null}
                </div>
                <Select
                  value={row.productId}
                  items={productItems}
                  onValueChange={(value) => updateRow(row.key, { productId: value as string })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Elegí un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={row.quantityValue}
                  onChange={(e) => updateRow(row.key, { quantityValue: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Unidad</Label>
                <Select
                  value={row.quantityUnit}
                  items={unitItems}
                  onValueChange={(value) => updateRow(row.key, { quantityUnit: value as LoadProductUnit })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOAD_PRODUCT_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {LOAD_PRODUCT_UNIT_LABELS[u]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar producto"
                onClick={() => removeRow(row.key)}
                className="self-end"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {suggestion ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Sugerido (según {suggestion.estimatedCoverageHa} ha estimadas de cobertura):{" "}
                <button
                  type="button"
                  className="font-medium text-foreground underline decoration-dotted underline-offset-2"
                  onClick={() =>
                    updateRow(row.key, {
                      quantityValue: String(suggestion.suggested.value),
                      quantityUnit: suggestion.suggested.unit === "L" ? "l" : "kg",
                    })
                  }
                >
                  {suggestion.suggested.value} {suggestion.suggested.unit}
                </button>{" "}
                -- tocá para usarlo
              </p>
            ) : null}
          </div>
        );
      })}

      <Button type="button" variant="outline" className="self-start" onClick={() => onChange([...rows, newLoadProductRow()])}>
        <Plus className="size-4" />
        Agregar otro producto
      </Button>
    </div>
  );
}
