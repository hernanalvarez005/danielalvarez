"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { createProduct, updateProduct, type ProductFormState } from "@/lib/masters/products-actions";
import { PRODUCT_UNITS, PRODUCT_UNIT_LABELS } from "@/lib/masters/schemas";
import type { ProductItem } from "@/lib/masters/products";
import { useCloseOnSuccess } from "@/lib/masters/use-close-on-success";

const initialState: ProductFormState = { error: null };

export function ProductFormSheet({ product, trigger }: { product?: ProductItem; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const [state, formAction, pending] = useActionState(action, initialState);

  useCloseOnSuccess(state, setOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{product ? "Editar producto" : "Nuevo producto"}</SheetTitle>
          <SheetDescription>Este catálogo se va a reutilizar en las futuras recetas.</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-4 px-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-name">Nombre *</Label>
            <Input id="product-name" name="name" defaultValue={product?.name} required disabled={pending} />
            {state.fieldErrors?.name ? (
              <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-unit">Unidad predeterminada *</Label>
            <Select
              name="defaultUnit"
              defaultValue={product?.defaultUnit ?? "l"}
              items={PRODUCT_UNITS.map((unit) => ({ value: unit, label: PRODUCT_UNIT_LABELS[unit] }))}
              required
              disabled={pending}
            >
              <SelectTrigger id="product-unit" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_UNITS.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {PRODUCT_UNIT_LABELS[unit]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-notes">Notas</Label>
            <Textarea
              id="product-notes"
              name="notes"
              rows={3}
              defaultValue={product?.notes ?? ""}
              disabled={pending}
            />
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
