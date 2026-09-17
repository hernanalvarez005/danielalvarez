import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadsPanel } from "./loads-panel";
import { CorrectExecutionSummarySheet } from "./correct-execution-summary-sheet";
import { ResendToReviewButton } from "./resend-to-review-button";
import type { WorkOrderDetail } from "@/lib/spray-orders/queries";
import type { SprayExecutionDetail } from "@/lib/spray-executions/queries";
import type { ProductItem } from "@/lib/masters/products";

/**
 * The applicator's correction flow for an observed application: same
 * load registration/edit/delete tools as while in_progress (RLS allows
 * both statuses), plus editing actual_area_ha/notes and resending to
 * review. Recipe and planning stay read-only -- there is no path here
 * that touches spray_order_products or work_orders' planning columns.
 */
export function ObservedCorrectionScreen({
  workOrder,
  execution,
  allProducts,
  observationNotes,
}: {
  workOrder: WorkOrderDetail;
  execution: SprayExecutionDetail;
  allProducts: ProductItem[];
  observationNotes: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex flex-col gap-2 pt-6">
          <Badge variant="warning" className="w-fit">
            <Eye data-icon="inline-start" />
            APLICACIÓN OBSERVADA
          </Badge>
          <p className="text-lg font-semibold">
            {workOrder.fieldName} -- {workOrder.plotName}
          </p>
          {observationNotes ? (
            <div>
              <p className="text-xs text-muted-foreground">Motivo</p>
              <p className="text-sm whitespace-pre-wrap">{observationNotes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {execution.actualAreaHa != null ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="text-xs text-muted-foreground">Superficie realizada actual</p>
              <p className="text-lg font-semibold">{execution.actualAreaHa} ha</p>
            </div>
            <CorrectExecutionSummarySheet
              workOrderId={workOrder.id}
              actualAreaHa={execution.actualAreaHa}
              notes={execution.notes}
            />
          </CardContent>
        </Card>
      ) : null}

      <LoadsPanel
        workOrder={workOrder}
        execution={execution}
        allProducts={allProducts}
        footer={() => <ResendToReviewButton workOrderId={workOrder.id} />}
      />
    </div>
  );
}
