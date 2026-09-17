"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldDetail } from "@/lib/masters/fields";
import type { CustomerOption } from "@/lib/masters/fields";
import type { FieldFormState } from "@/lib/masters/fields-actions";

const initialState: FieldFormState = { error: null };

export function FieldForm({
  action,
  field,
  customers,
  defaultCustomerId,
  cancelHref,
}: {
  action: (state: FieldFormState, formData: FormData) => Promise<FieldFormState>;
  field?: FieldDetail;
  customers: CustomerOption[];
  defaultCustomerId?: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="customerId">Cliente *</Label>
          <Select
            name="customerId"
            defaultValue={field?.customerId ?? defaultCustomerId}
            items={customers.map((c) => ({ value: c.id, label: c.name }))}
            required
            disabled={pending}
          >
            <SelectTrigger id="customerId" className="w-full">
              <SelectValue placeholder="Seleccioná un cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.customerId ? <p className="text-xs text-destructive">{errors.customerId}</p> : null}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="name">Nombre del campo *</Label>
          <Input id="name" name="name" defaultValue={field?.name} required disabled={pending} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="locality">Localidad</Label>
          <Input id="locality" name="locality" defaultValue={field?.locality ?? ""} disabled={pending} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="province">Provincia</Label>
          <Input id="province" name="province" defaultValue={field?.province ?? ""} disabled={pending} />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={field?.notes ?? ""} disabled={pending} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} nativeButton={false} render={<Link href={cancelHref}>Cancelar</Link>} />
      </div>
    </form>
  );
}
