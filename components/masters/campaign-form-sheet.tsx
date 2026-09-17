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
import { createCampaign, updateCampaign, type CampaignFormState } from "@/lib/masters/campaigns-actions";
import type { CampaignItem } from "@/lib/masters/campaigns";
import { useCloseOnSuccess } from "@/lib/masters/use-close-on-success";

const initialState: CampaignFormState = { error: null };

export function CampaignFormSheet({ campaign, trigger }: { campaign?: CampaignItem; trigger: React.ReactElement }) {
  const [open, setOpen] = useState(false);
  const action = campaign ? updateCampaign.bind(null, campaign.id) : createCampaign;
  const [state, formAction, pending] = useActionState(action, initialState);

  useCloseOnSuccess(state, setOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={trigger} />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{campaign ? "Editar campaña" : "Nueva campaña"}</SheetTitle>
          <SheetDescription>Ej: 2026/27</SheetDescription>
        </SheetHeader>

        <form action={formAction} className="flex flex-col gap-4 px-4">
          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="campaign-name">Nombre *</Label>
            <Input id="campaign-name" name="name" defaultValue={campaign?.name} required disabled={pending} />
            {state.fieldErrors?.name ? (
              <p className="text-xs text-destructive">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-start">Inicio</Label>
              <Input
                id="campaign-start"
                name="startDate"
                type="date"
                defaultValue={campaign?.startDate ?? ""}
                disabled={pending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="campaign-end">Fin</Label>
              <Input
                id="campaign-end"
                name="endDate"
                type="date"
                defaultValue={campaign?.endDate ?? ""}
                disabled={pending}
              />
            </div>
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
