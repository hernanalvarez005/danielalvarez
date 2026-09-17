"use client";

import { useActionState, useState } from "react";
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
import { createPlot, updatePlot, type PlotFormState } from "@/lib/masters/plots-actions";
import { useCloseOnSuccess } from "@/lib/masters/use-close-on-success";

export interface PlotFormValues {
  id: string;
  name: string;
  areaHa: number | null;
  notes?: string | null;
}

const initialState: PlotFormState = { error: null };

export function PlotFormSheet({
  fieldId,
  plot,
  trigger,
}: {
  fieldId: string;
  plot?: PlotFormValues;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const action = plot ? updatePlot.bind(null, plot.id) : createPlot;
  const [state, formAction, pending] = useActionState(action, initialState);

  useCloseOnSuccess(state, setOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{plot ? "Editar lote" : "Nuevo lote"}</SheetTitle>
          <SheetDescription>
            {plot ? "Actualizá los datos del lote." : "Cargá un lote dentro de este campo."}
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-4 px-4">
          <input type="hidden" name="fieldId" value={fieldId} />

          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="plot-name">Nombre *</Label>
            <Input id="plot-name" name="name" defaultValue={plot?.name} required disabled={pending} />
            {state.fieldErrors?.name ? (
              <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="plot-area">Superficie (ha)</Label>
            <Input
              id="plot-area"
              name="areaHa"
              type="number"
              step="0.01"
              min="0"
              defaultValue={plot?.areaHa ?? ""}
              disabled={pending}
            />
            {state.fieldErrors?.areaHa ? (
              <p className="text-xs text-destructive">{state.fieldErrors.areaHa}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="plot-notes">Notas</Label>
            <Textarea id="plot-notes" name="notes" rows={3} defaultValue={plot?.notes ?? ""} disabled={pending} />
          </div>

          <SheetFooter className="flex-row px-0">
            <SheetClose
              render={
                <Button type="button" variant="outline" className="flex-1" disabled={pending}>
                  Cancelar
                </Button>
              }
            />
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
