"use client";

import { useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LoadProductEditor, type LoadProductRow } from "./load-product-editor";
import { registerSprayLoad, updateSprayLoad } from "@/lib/spray-executions/actions";
import { formatLoadNumber, type LoadProductUnit } from "@/lib/spray-executions/constants";
import type { WorkOrderProductDetail } from "@/lib/spray-orders/queries";
import type { SprayLoadDetail } from "@/lib/spray-executions/queries";
import type { ProductItem } from "@/lib/masters/products";
import type { DoseUnit } from "@/lib/spray-orders/constants";

interface DraftShape {
  clientRequestId: string;
  waterLiters: string;
  notes: string;
  rows: LoadProductRow[];
}

function draftKey(workOrderId: string) {
  return `spray-load-draft:${workOrderId}`;
}

function readDraft(workOrderId: string): DraftShape | null {
  try {
    const raw = localStorage.getItem(draftKey(workOrderId));
    return raw ? (JSON.parse(raw) as DraftShape) : null;
  } catch {
    return null;
  }
}

function writeDraft(workOrderId: string, draft: DraftShape) {
  try {
    localStorage.setItem(draftKey(workOrderId), JSON.stringify(draft));
  } catch {
    // Best-effort only -- a private window or full storage just means no
    // resilience across a reload, never a hard failure of the form.
  }
}

function clearDraft(workOrderId: string) {
  try {
    localStorage.removeItem(draftKey(workOrderId));
  } catch {
    // ignore
  }
}

function recipeToRows(recipeProducts: WorkOrderProductDetail[]): LoadProductRow[] {
  return recipeProducts.map((p) => ({
    key: p.id,
    productId: p.productId,
    quantityValue: "",
    quantityUnit: (p.doseUnit.endsWith("_ha") && (p.doseUnit === "kg_ha" || p.doseUnit === "g_ha") ? "kg" : "l") as LoadProductUnit,
  }));
}

function loadToRows(load: SprayLoadDetail): LoadProductRow[] {
  return load.products.map((p) => ({
    key: p.id,
    productId: p.productId,
    quantityValue: String(p.quantityValue),
    quantityUnit: p.quantityUnit,
  }));
}

export function LoadFormSheet({
  workOrderId,
  loadNumberForNew,
  recipeProducts,
  allProducts,
  targetSprayVolumePerHa,
  trigger,
  load,
  prefillFrom,
}: {
  workOrderId: string;
  /** Only used for the sheet title when creating a new load. */
  loadNumberForNew?: number;
  recipeProducts: WorkOrderProductDetail[];
  allProducts: ProductItem[];
  targetSprayVolumePerHa: number | null;
  trigger: React.ReactElement;
  load?: SprayLoadDetail;
  prefillFrom?: SprayLoadDetail;
}) {
  const isEdit = load !== undefined;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clientRequestId, setClientRequestId] = useState("");
  const [waterLiters, setWaterLiters] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<LoadProductRow[]>([]);

  // Re-initialize the form whenever the sheet transitions from closed to
  // open. Deriving this during render (comparing against the previous
  // `open` value) is what React recommends instead of a useEffect that
  // calls setState -- it avoids an extra render pass and is the same
  // pattern useCloseOnSuccess uses elsewhere in this codebase.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);

    if (open) {
      if (isEdit && load) {
        setWaterLiters(String(load.waterLiters));
        setNotes(load.notes ?? "");
        setRows(loadToRows(load));
      } else {
        const draft = readDraft(workOrderId);
        if (draft) {
          setClientRequestId(draft.clientRequestId);
          setWaterLiters(draft.waterLiters);
          setNotes(draft.notes);
          setRows(draft.rows);
        } else {
          setClientRequestId(crypto.randomUUID());
          if (prefillFrom) {
            setWaterLiters(String(prefillFrom.waterLiters));
            setNotes("");
            setRows(loadToRows(prefillFrom));
          } else {
            setWaterLiters("");
            setNotes("");
            setRows(recipeToRows(recipeProducts));
          }
        }
      }
    }
  }

  function persistDraft(next: Partial<DraftShape>) {
    if (isEdit) return;
    writeDraft(workOrderId, {
      clientRequestId,
      waterLiters,
      notes,
      rows,
      ...next,
    });
  }

  function handleWaterChange(value: string) {
    setWaterLiters(value);
    persistDraft({ waterLiters: value });
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    persistDraft({ notes: value });
  }

  function handleRowsChange(next: LoadProductRow[]) {
    setRows(next);
    persistDraft({ rows: next });
  }

  const recipeByProductId = new Map<string, { doseValue: number; doseUnit: DoseUnit }>(
    recipeProducts.map((p) => [p.productId, { doseValue: p.doseValue, doseUnit: p.doseUnit }]),
  );

  function handleSubmit() {
    setError(null);
    const water = Number(waterLiters);
    const products = rows
      .filter((r) => r.productId && Number(r.quantityValue) > 0)
      .map((r) => ({
        productId: r.productId,
        quantityValue: Number(r.quantityValue),
        quantityUnit: r.quantityUnit,
      }));

    startTransition(async () => {
      const result =
        isEdit && load
          ? await updateSprayLoad(workOrderId, { loadId: load.id, waterLiters: water, notes: notes || null, products })
          : await registerSprayLoad({
              workOrderId,
              clientRequestId,
              waterLiters: water,
              notes: notes || null,
              products,
            });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!isEdit) clearDraft(workOrderId);
      setOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? `Editar ${formatLoadNumber(load.loadNumber)}` : loadNumberForNew ? formatLoadNumber(loadNumberForNew) : "Nueva carga"}
          </SheetTitle>
          <SheetDescription>Registrá el agua y los productos realmente utilizados en esta carga.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="load-water">Agua (L) *</Label>
            <Input
              id="load-water"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={waterLiters}
              onChange={(e) => handleWaterChange(e.target.value)}
              disabled={pending}
              className="h-12 text-lg"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Productos</Label>
            <LoadProductEditor
              products={allProducts}
              recipeByProductId={recipeByProductId}
              rows={rows}
              onChange={handleRowsChange}
              waterLiters={Number(waterLiters) || 0}
              targetSprayVolumePerHa={targetSprayVolumePerHa}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="load-notes">Observaciones</Label>
            <Textarea
              id="load-notes"
              rows={2}
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        <SheetFooter className="flex-row px-4">
          <SheetClose
            render={
              <Button type="button" variant="outline" className="flex-1" disabled={pending}>
                Cancelar
              </Button>
            }
          />
          <Button type="button" className="flex-1" onClick={handleSubmit} disabled={pending || !waterLiters}>
            {pending ? "Guardando..." : "Guardar carga"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
