"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  createApplicator,
  updateApplicator,
  type ApplicatorFormState,
} from "@/lib/masters/applicators-actions";
import type { ApplicatorItem, OrgUserOption } from "@/lib/masters/applicators";
import { useCloseOnSuccess } from "@/lib/masters/use-close-on-success";

const initialState: ApplicatorFormState = { error: null };
const NONE_VALUE = "__none__";

export function ApplicatorFormSheet({
  applicator,
  userOptions,
  trigger,
}: {
  applicator?: ApplicatorItem;
  userOptions: OrgUserOption[];
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const action = applicator ? updateApplicator.bind(null, applicator.id) : createApplicator;
  const [state, formAction, pending] = useActionState(action, initialState);

  useCloseOnSuccess(state, setOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{applicator ? "Editar aplicador" : "Nuevo aplicador"}</SheetTitle>
          <SheetDescription>
            No todos los aplicadores necesitan un usuario del sistema.
          </SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-4 px-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="applicator-name">Nombre *</Label>
            <Input id="applicator-name" name="name" defaultValue={applicator?.name} required disabled={pending} />
            {state.fieldErrors?.name ? (
              <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="applicator-phone">Teléfono</Label>
            <Input id="applicator-phone" name="phone" defaultValue={applicator?.phone ?? ""} disabled={pending} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="applicator-profile">Usuario vinculado</Label>
            <Select
              name="profileId"
              defaultValue={applicator?.profileId ?? NONE_VALUE}
              items={[
                { value: NONE_VALUE, label: "Sin vincular" },
                ...userOptions.map((u) => ({ value: u.profileId, label: u.label })),
              ]}
              disabled={pending}
            >
              <SelectTrigger id="applicator-profile" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sin vincular</SelectItem>
                {userOptions.map((u) => (
                  <SelectItem key={u.profileId} value={u.profileId}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
