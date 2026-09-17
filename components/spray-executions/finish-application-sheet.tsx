"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
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
import { finishSprayApplication } from "@/lib/spray-executions/actions";
import { formatQuantityTotals, type QuantityTotals } from "@/lib/spray-executions/calculations";

export function FinishApplicationSheet({
  workOrderId,
  plannedAreaHa,
  loadsCount,
  waterTotal,
  productTotals,
}: {
  workOrderId: string;
  plannedAreaHa: number;
  loadsCount: number;
  waterTotal: number;
  productTotals: { productName: string; totals: QuantityTotals }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [actualAreaHa, setActualAreaHa] = useState(String(plannedAreaHa));
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await finishSprayApplication({
        workOrderId,
        actualAreaHa: Number(actualAreaHa),
        notes: notes || null,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="lg" className="h-14 w-full text-base" disabled={loadsCount === 0}>
            <CheckCircle2 className="size-5" />
            Finalizar aplicación
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Finalizar aplicación</SheetTitle>
          <SheetDescription>Revisá el resumen y confirmá la superficie realmente trabajada.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-lg border p-3 text-sm">
            <p className="flex justify-between py-1">
              <span className="text-muted-foreground">Cargas registradas</span>
              <span className="font-medium tabular-nums">{loadsCount}</span>
            </p>
            <p className="flex justify-between py-1">
              <span className="text-muted-foreground">Agua total</span>
              <span className="font-medium tabular-nums">{waterTotal} L</span>
            </p>
            {productTotals.map((p) => (
              <p key={p.productName} className="flex justify-between py-1">
                <span className="text-muted-foreground">{p.productName}</span>
                <span className="font-medium tabular-nums">{formatQuantityTotals(p.totals)}</span>
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="actual-area">Superficie realizada (ha) *</Label>
            <Input
              id="actual-area"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={actualAreaHa}
              onChange={(e) => setActualAreaHa(e.target.value)}
              disabled={pending}
              className="h-12 text-lg"
            />
            <p className="text-xs text-muted-foreground">Previsto: {plannedAreaHa} ha. Puede diferir -- registrá lo que realmente se hizo.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="finish-notes">Observaciones</Label>
            <Textarea
              id="finish-notes"
              rows={3}
              placeholder='Ej: "Quedaron 2 ha sin aplicar por humedad."'
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
          <Button type="button" className="flex-1" onClick={handleSubmit} disabled={pending || !actualAreaHa}>
            {pending ? "Finalizando..." : "Confirmar finalización"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
