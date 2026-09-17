"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
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
import { startSprayApplication } from "@/lib/spray-executions/actions";
import { formatOrderNumber } from "@/lib/spray-orders/constants";

export function StartApplicationButton({
  workOrderId,
  orderNumber,
}: {
  workOrderId: string;
  orderNumber: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await startSprayApplication(workOrderId);
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
          <Button size="lg" className="h-14 w-full text-base">
            <PlayCircle className="size-5" />
            Iniciar aplicación
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Iniciar {formatOrderNumber(orderNumber)}?</AlertDialogTitle>
          <AlertDialogDescription>
            La planificación de esta orden va a quedar bloqueada y vas a poder empezar a registrar cargas de tanque.
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
            {pending ? "Iniciando..." : "Sí, iniciar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
