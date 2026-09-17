"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateTheoreticalQuantity, formatQuantity } from "@/lib/spray-orders/calculations";
import { DOSE_UNITS, DOSE_UNIT_LABELS, type DoseUnit } from "@/lib/spray-orders/constants";
import type { ProductOption } from "@/lib/spray-orders/options";

export interface RecipeLine {
  key: string;
  productId: string;
  doseValue: string;
  doseUnit: DoseUnit;
}

export function newRecipeLine(): RecipeLine {
  return { key: crypto.randomUUID(), productId: "", doseValue: "", doseUnit: "l_ha" };
}

export function RecipeEditor({
  products,
  lines,
  onChange,
  areaHa,
  error,
}: {
  products: ProductOption[];
  lines: RecipeLine[];
  onChange: (lines: RecipeLine[]) => void;
  areaHa: number;
  error?: string;
}) {
  function updateLine(key: string, patch: Partial<RecipeLine>) {
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    onChange(lines.filter((l) => l.key !== key));
  }

  const productItems = products.map((p) => ({ value: p.id, label: p.name }));
  const unitItems = DOSE_UNITS.map((u) => ({ value: u, label: DOSE_UNIT_LABELS[u] }));

  return (
    <div className="flex flex-col gap-3">
      {lines.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          Todavía no agregaste productos.
        </p>
      ) : null}

      {lines.map((line) => {
        const doseValue = Number(line.doseValue);
        const quantity =
          line.productId && doseValue > 0
            ? calculateTheoreticalQuantity(doseValue, line.doseUnit, areaHa)
            : null;

        return (
          <div key={line.key} className="rounded-lg border p-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
              <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
                <Label>Producto</Label>
                <Select
                  value={line.productId}
                  items={productItems}
                  onValueChange={(value) => updateLine(line.key, { productId: value as string })}
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
                <Label>Dosis</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={line.doseValue}
                  onChange={(e) => updateLine(line.key, { doseValue: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Unidad</Label>
                <Select
                  value={line.doseUnit}
                  items={unitItems}
                  onValueChange={(value) => updateLine(line.key, { doseUnit: value as DoseUnit })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOSE_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {DOSE_UNIT_LABELS[u]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-muted-foreground">Cantidad teórica</Label>
                <p className="flex h-8 items-center text-sm font-medium tabular-nums">
                  {quantity ? formatQuantity(quantity) : "-"}
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Quitar producto"
                onClick={() => removeLine(line.key)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        );
      })}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => onChange([...lines, newRecipeLine()])}
      >
        <Plus className="size-4" />
        Agregar producto
      </Button>
    </div>
  );
}
