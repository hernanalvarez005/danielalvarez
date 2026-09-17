import { Copy, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadFormSheet } from "./load-form-sheet";
import { DeleteLoadButton } from "./delete-load-button";
import { FinishApplicationSheet } from "./finish-application-sheet";
import { groupProductTotals, type QuantityTotals } from "@/lib/spray-executions/calculations";
import { formatQuantityTotals } from "@/lib/spray-executions/calculations";
import { formatLoadNumber } from "@/lib/spray-executions/constants";
import { roundTo } from "@/lib/spray-orders/calculations";
import type { WorkOrderDetail } from "@/lib/spray-orders/queries";
import type { SprayExecutionDetail } from "@/lib/spray-executions/queries";
import type { ProductItem } from "@/lib/masters/products";

function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function computeProductTotals(loads: SprayExecutionDetail["loads"]): { productName: string; totals: QuantityTotals }[] {
  return groupProductTotals(
    loads.flatMap((l) => l.products.map((p) => ({ productName: p.productName, value: p.quantityValue, unit: p.quantityUnit }))),
  );
}

export function ExecutionScreen({
  workOrder,
  execution,
  allProducts,
}: {
  workOrder: WorkOrderDetail;
  execution: SprayExecutionDetail;
  allProducts: ProductItem[];
}) {
  const waterTotal = roundTo(execution.loads.reduce((sum, l) => sum + l.waterLiters, 0));
  const productTotals = computeProductTotals(execution.loads);
  const lastLoad = execution.loads.length > 0 ? execution.loads[execution.loads.length - 1] : undefined;

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

      <FinishApplicationSheet
        workOrderId={workOrder.id}
        plannedAreaHa={workOrder.plannedAreaHa}
        loadsCount={execution.loads.length}
        waterTotal={waterTotal}
        productTotals={productTotals}
      />
    </div>
  );
}
