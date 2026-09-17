"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createCrop, updateCrop, type CropFormState } from "@/lib/masters/crops-actions";
import type { CropItem } from "@/lib/masters/crops";
import { useCloseOnSuccess } from "@/lib/masters/use-close-on-success";

const initialState: CropFormState = { error: null };

export function CropFormSheet({ crop, trigger }: { crop?: CropItem; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const action = crop ? updateCrop.bind(null, crop.id) : createCrop;
  const [state, formAction, pending] = useActionState(action, initialState);

  useCloseOnSuccess(state, setOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{crop ? "Editar cultivo" : "Nuevo cultivo"}</SheetTitle>
          <SheetDescription>Ej: Soja, Maíz, Trigo.</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-4 px-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="crop-name">Nombre *</Label>
            <Input id="crop-name" name="name" defaultValue={crop?.name} required disabled={pending} />
            {state.fieldErrors?.name ? (
              <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
            ) : null}
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
