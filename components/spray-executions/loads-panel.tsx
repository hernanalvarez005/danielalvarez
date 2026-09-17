import { Copy, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadFormSheet } from "./load-form-sheet";
import { DeleteLoadButton } from "./delete-load-button";
import { groupProductTotals, formatQuantityTotals, type QuantityTotals } from "@/lib/spray-executions/calculations";
import { formatLoadNumber } from "@/lib/spray-executions/constants";
import { roundTo } from "@/lib/spray-orders/calculations";
import type { WorkOrderDetail } from "@/lib/spray-orders/queries";
import type { SprayExecutionDetail } from "@/lib/spray-executions/queries";
import type { ProductItem } from "@/lib/masters/products";

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function computeLoadTotals(loads: SprayExecutionDetail["loads"]) {
  const waterTotal = roundTo(loads.reduce((sum, l) => sum + l.waterLiters, 0));
  const productTotals: { productName: string; totals: QuantityTotals }[] = groupProductTotals(
    loads.flatMap((l) => l.products.map((p) => ({ productName: p.productName, value: p.quantityValue, unit: p.quantityUnit }))),
  );
  return { waterTotal, productTotals };
}

/**
 * Shared between the in_progress execution screen and the observed
 * correction screen -- registering/editing/repeating/deleting a load
 * works identically in both states (RLS gates the actual writes to
 * in_progress or observed). `footer` receives the same totals this
 * panel displays, so a Finalizar/Reenviar button downstream never
 * recomputes them separately.
 */
export function LoadsPanel({
  workOrder,
  execution,
  allProducts,
  footer,
}: {
  workOrder: WorkOrderDetail;
  execution: SprayExecutionDetail;
  allProducts: ProductItem[];
  footer?: (totals: { waterTotal: number; productTotals: { productName: string; totals: QuantityTotals }[] }) => React.ReactNode;
}) {
  const { waterTotal, productTotals } = computeLoadTotals(execution.loads);
  const lastLoad = execution.loads.length > 0 ? execution.loads[execution.loads.length - 1] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6">
          <div>
            <p className="text-xs text-muted-foreground">Cargas registradas</p>
            <p className="text-2xl font-semibold tabular-nums">{execution.loads.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agua registrada</p>
            <p className="text-2xl font-semibold tabular-nums">{waterTotal} L</p>
          </div>
          {productTotals.length > 0 ? (
            <div className="col-span-2 flex flex-col gap-1 border-t pt-3">
              <p className="text-xs text-muted-foreground">Productos utilizados</p>
              {productTotals.map((p) => (
                <p key={p.productName} className="flex justify-between text-sm">
                  <span>{p.productName}</span>
                  <span className="font-medium tabular-nums">{formatQuantityTotals(p.totals)}</span>
                </p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <LoadFormSheet
          workOrderId={workOrder.id}
          loadNumberForNew={execution.loads.length + 1}
          recipeProducts={workOrder.products}
          allProducts={allProducts}
          targetSprayVolumePerHa={workOrder.targetSprayVolumePerHa}
          trigger={
            <Button size="lg" className="h-14 flex-1 text-base">
              <Plus className="size-5" />
              Registrar carga
            </Button>
          }
        />
        {lastLoad ? (
          <LoadFormSheet
            workOrderId={workOrder.id}
            loadNumberForNew={execution.loads.length + 1}
            recipeProducts={workOrder.products}
            allProducts={allProducts}
            targetSprayVolumePerHa={workOrder.targetSprayVolumePerHa}
            prefillFrom={lastLoad}
            trigger={
              <Button size="lg" variant="outline" className="h-14 flex-1 text-base">
                <Copy className="size-5" />
                Repetir última carga
              </Button>
            }
          />
        ) : null}
      </div>

      {execution.loads.length > 0 ? (
        <div className="flex flex-col gap-3">
          {[...execution.loads].reverse().map((load) => (
            <Card key={load.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
                <CardTitle className="text-sm font-semibold">{formatLoadNumber(load.loadNumber)}</CardTitle>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{formatTime(load.recordedAt)}</span>
                  <LoadFormSheet
                    workOrderId={workOrder.id}
                    recipeProducts={workOrder.products}
                    allProducts={allProducts}
                    targetSprayVolumePerHa={workOrder.targetSprayVolumePerHa}
                    load={load}
                    trigger={
                      <Button type="button" variant="ghost" size="sm">
                        Editar
                      </Button>
                    }
                  />
                  <DeleteLoadButton workOrderId={workOrder.id} loadId={load.id} loadNumber={load.loadNumber} />
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 pt-0 pb-3 text-sm">
                <p className="text-muted-foreground">Agua: {load.waterLiters} L</p>
                {load.products.map((p) => (
                  <p key={p.id} className="flex items-center gap-2">
                    <span>
                      {p.productName}: {p.quantityValue} {p.quantityUnit}
                    </span>
                    {!p.inRecipe ? (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        No estaba en la receta
                      </Badge>
                    ) : null}
                  </p>
                ))}
                {load.notes ? <p className="text-muted-foreground italic">{load.notes}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          Todavía no registraste ninguna carga.
        </p>
      )}

      {footer ? footer({ waterTotal, productTotals }) : null}
    </div>
  );
}
