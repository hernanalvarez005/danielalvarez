import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { LoadsPanel } from "./loads-panel";
import { FinishApplicationSheet } from "./finish-application-sheet";
import type { WorkOrderDetail } from "@/lib/spray-orders/queries";
import type { SprayExecutionDetail } from "@/lib/spray-executions/queries";
import type { ProductItem } from "@/lib/masters/products";

export function ExecutionScreen({
  workOrder,
  execution,
  allProducts,
}: {
  workOrder: WorkOrderDetail;
  execution: SprayExecutionDetail;
  allProducts: ProductItem[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex flex-col gap-1 pt-6">
          <Badge variant="warning" className="w-fit">
            EN EJECUCIÓN
          </Badge>
          <p className="text-lg font-semibold">
            {workOrder.fieldName} -- {workOrder.plotName}
          </p>
          <p className="text-sm text-muted-foreground">Superficie prevista: {workOrder.plannedAreaHa} ha</p>
        </CardContent>
      </Card>

      <LoadsPanel
        workOrder={workOrder}
        execution={execution}
        allProducts={allProducts}
        footer={({ waterTotal, productTotals }) => (
          <FinishApplicationSheet
            workOrderId={workOrder.id}
            plannedAreaHa={workOrder.plannedAreaHa}
            loadsCount={execution.loads.length}
            waterTotal={waterTotal}
            productTotals={productTotals}
          />
        )}
      />
    </div>
  );
}
