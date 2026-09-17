import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatQuantityTotals, groupProductTotals } from "@/lib/spray-executions/calculations";
import { formatLoadNumber } from "@/lib/spray-executions/constants";
import { roundTo } from "@/lib/spray-orders/calculations";
import type { SprayExecutionDetail } from "@/lib/spray-executions/queries";
import type { WorkOrderStatus } from "@/lib/spray-orders/constants";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

/**
 * Read-only backoffice view of an execution's progress (admin/engineer).
 * No action buttons here -- starting/registering/finishing is the
 * applicator's mobile flow at /mis-trabajos. This is visualization only.
 */
export function ExecutionPanel({
  execution,
  status,
}: {
  execution: SprayExecutionDetail;
  status: WorkOrderStatus;
}) {
  const waterTotal = roundTo(execution.loads.reduce((sum, l) => sum + l.waterLiters, 0));
  const productTotals = groupProductTotals(
    execution.loads.flatMap((l) =>
      l.products.map((p) => ({ productName: p.productName, value: p.quantityValue, unit: p.quantityUnit })),
    ),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ejecución</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Iniciada</p>
            <p className="text-sm font-medium">
              {execution.startedAt ? formatDateTime(execution.startedAt) : "-"}
              {execution.startedByName ? ` -- ${execution.startedByName}` : ""}
            </p>
          </div>
          {status === "pending_review" || status === "completed" || status === "observed" ? (
            <div>
              <p className="text-xs text-muted-foreground">Finalizada</p>
              <p className="text-sm font-medium">
                {execution.finishedAt ? formatDateTime(execution.finishedAt) : "-"}
                {execution.finishedByName ? ` -- ${execution.finishedByName}` : ""}
              </p>
            </div>
          ) : null}
        </div>

        {status === "pending_review" || status === "completed" || status === "observed" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Superficie realizada</p>
              <p className="text-sm font-medium">{execution.actualAreaHa ?? "-"} ha</p>
            </div>
            {execution.notes ? (
              <div>
                <p className="text-xs text-muted-foreground">Observaciones del operador</p>
                <p className="text-sm font-medium whitespace-pre-wrap">{execution.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Cargas</p>
            <p className="text-lg font-semibold tabular-nums">{execution.loads.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Agua acumulada</p>
            <p className="text-lg font-semibold tabular-nums">{waterTotal} L</p>
          </div>
        </div>

        {productTotals.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Productos acumulados</p>
            {productTotals.map((p) => (
              <p key={p.productName} className="flex justify-between text-sm">
                <span>{p.productName}</span>
                <span className="font-medium tabular-nums">{formatQuantityTotals(p.totals)}</span>
              </p>
            ))}
          </div>
        ) : null}

        {execution.loads.length > 0 ? (
          <div className="flex flex-col gap-2 border-t pt-3">
            <p className="text-xs text-muted-foreground">Detalle de cargas</p>
            {execution.loads.map((load) => (
              <div key={load.id} className="rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{formatLoadNumber(load.loadNumber)}</span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(load.recordedAt)}</span>
                </div>
                <p className="text-muted-foreground">Agua: {load.waterLiters} L</p>
                {load.products.map((p) => (
                  <p key={p.id} className="flex items-center gap-2 text-muted-foreground">
                    {p.productName}: {p.quantityValue} {p.quantityUnit}
                    {!p.inRecipe ? (
                      <Badge variant="outline" className="text-[10px] font-normal">
                        No estaba en la receta
                      </Badge>
                    ) : null}
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
