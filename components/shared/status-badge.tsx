import { FileEdit, Circle, PlayCircle, ClipboardCheck, CheckCircle2, XCircle } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from "@/lib/spray-orders/constants";

export type { WorkOrderStatus };

/**
 * Shared work-order status vocabulary across operational modules
 * (Pulverizaciones and beyond). Status is always communicated with an
 * icon + label, never color alone.
 */
const STATUS_CONFIG: Record<
  WorkOrderStatus,
  { icon: typeof Circle; variant: VariantProps<typeof badgeVariants>["variant"] }
> = {
  draft: { icon: FileEdit, variant: "outline" },
  pending: { icon: Circle, variant: "secondary" },
  in_progress: { icon: PlayCircle, variant: "warning" },
  pending_review: { icon: ClipboardCheck, variant: "default" },
  completed: { icon: CheckCircle2, variant: "success" },
  cancelled: { icon: XCircle, variant: "destructive" },
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const { icon: Icon, variant } = STATUS_CONFIG[status];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {WORK_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
