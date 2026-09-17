"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { reviewSprayApplication } from "@/lib/spray-orders/actions";
import { formatOrderNumber } from "@/lib/spray-orders/constants";

function ApproveDialog({ workOrderId, orderNumber }: { workOrderId: string; orderNumber: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await reviewSprayApplication({ workOrderId, decision: "approved", notes: null });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button>
            <CheckCircle2 className="size-4" />
            Aprobar aplicación
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Aprobar {formatOrderNumber(orderNumber)}?</AlertDialogTitle>
          <AlertDialogDescription>
            La orden queda finalizada. Esta decisión se guarda en el historial de revisiones.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={handleConfirm}>
            {pending ? "Aprobando..." : "Sí, aprobar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ObserveSheet({ workOrderId }: { workOrderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await reviewSprayApplication({ workOrderId, decision: "observed", notes: notes || null });
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
          <Button variant="outline">
            <Eye className="size-4" />
            Observar
          </Button>
        }
      />
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Observar aplicación</SheetTitle>
          <SheetDescription>
            El comentario es obligatorio y va a quedar visible para el aplicador asignado.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="observe-notes">Motivo *</Label>
            <Textarea
              id="observe-notes"
              rows={4}
              placeholder='Ej: "Revisar superficie realizada. El lote trabajado fue de 96 ha."'
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
          <Button type="button" className="flex-1" onClick={handleSubmit} disabled={pending || !notes.trim()}>
            {pending ? "Guardando..." : "Observar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function ReviewActions({ workOrderId, orderNumber }: { workOrderId: string; orderNumber: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ApproveDialog workOrderId={workOrderId} orderNumber={orderNumber} />
      <ObserveSheet workOrderId={workOrderId} />
    </div>
  );
}
