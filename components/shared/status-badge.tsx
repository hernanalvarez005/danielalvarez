import { Circle, PlayCircle, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

/**
 * Shared work-order status vocabulary for future operational modules
 * (Pulverizaciones and beyond). Status is always communicated with an
 * icon + label, never color alone.
 */
export type WorkOrderStatus =
  | "pendiente"
  | "en_ejecucion"
  | "para_revisar"
  | "finalizado"
  | "cancelado";

const STATUS_CONFIG: Record<
  WorkOrderStatus,
  { label: string; icon: typeof Circle; variant: VariantProps<typeof badgeVariants>["variant"] }
> = {
  pendiente: { label: "Pendiente", icon: Circle, variant: "secondary" },
  en_ejecucion: { label: "En ejecución", icon: PlayCircle, variant: "warning" },
  para_revisar: { label: "Para revisar", icon: ClipboardCheck, variant: "default" },
  finalizado: { label: "Finalizado", icon: CheckCircle2, variant: "success" },
  cancelado: { label: "Cancelado", icon: XCircle, variant: "destructive" },
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const { label, icon: Icon, variant } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {label}
    </Badge>
  );
}
