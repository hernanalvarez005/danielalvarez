"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerDetail } from "@/lib/masters/customers";
import type { CustomerFormState } from "@/lib/masters/customers-actions";

const initialState: CustomerFormState = { error: null };

export function CustomerForm({
  action,
  customer,
  cancelHref,
}: {
  action: (state: CustomerFormState, formData: FormData) => Promise<CustomerFormState>;
  customer?: CustomerDetail;
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
          <Label htmlFor="name">Nombre *</Label>
          <Input id="name" name="name" defaultValue={customer?.name} required disabled={pending} />
          {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="legalName">Razón social</Label>
          <Input id="legalName" name="legalName" defaultValue={customer?.legalName ?? ""} disabled={pending} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="taxId">CUIT</Label>
          <Input id="taxId" name="taxId" defaultValue={customer?.taxId ?? ""} disabled={pending} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" defaultValue={customer?.phone ?? ""} disabled={pending} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={customer?.email ?? ""}
            disabled={pending}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email}</p> : null}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={customer?.notes ?? ""} disabled={pending} />
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
