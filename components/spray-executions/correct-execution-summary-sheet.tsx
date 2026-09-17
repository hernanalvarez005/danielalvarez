"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
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
import { correctExecutionSummary } from "@/lib/spray-executions/actions";

export function CorrectExecutionSummarySheet({
  workOrderId,
  actualAreaHa,
  notes,
}: {
  workOrderId: string;
  actualAreaHa: number;
  notes: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState(String(actualAreaHa));
  const [noteValue, setNoteValue] = useState(notes ?? "");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await correctExecutionSummary({
        workOrderId,
        actualAreaHa: Number(area),
        notes: noteValue || null,
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
          <Button type="button" variant="outline">
            <Pencil className="size-4" />
            Corregir superficie / observaciones
          </Button>
        }
      />
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Corregir superficie realizada</SheetTitle>
          <SheetDescription>
            Solo se corrige el dato de ejecución -- la receta y la planificación quedan sin cambios.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="correct-area">Superficie realizada (ha) *</Label>
            <Input
              id="correct-area"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={pending}
              className="h-12 text-lg"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="correct-notes">Observaciones</Label>
            <Textarea
              id="correct-notes"
              rows={3}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
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
          <Button type="button" className="flex-1" onClick={handleSubmit} disabled={pending || !area}>
            {pending ? "Guardando..." : "Guardar corrección"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
