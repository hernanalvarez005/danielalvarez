import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StartApplicationButton } from "@/components/spray-executions/start-application-button";
import { ExecutionScreen } from "@/components/spray-executions/execution-screen";
import { ExecutionPanel } from "@/components/spray-executions/execution-panel";
import { getWorkOrder } from "@/lib/spray-orders/queries";
import { getSprayExecution } from "@/lib/spray-executions/queries";
import { listProducts } from "@/lib/masters/products";
import {
  calculateSprayVolume,
  calculateTheoreticalQuantity,
  formatLiters,
  formatQuantity,
} from "@/lib/spray-orders/calculations";
import { APPLICATION_METHOD_LABELS, DOSE_UNIT_LABELS, formatOrderNumber } from "@/lib/spray-orders/constants";

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-AR");
}

export default async function MiTrabajoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workOrder, execution, products] = await Promise.all([
    getWorkOrder(id),
    getSprayExecution(id),
    listProducts(),
  ]);
  if (!workOrder) notFound();

  const allProducts = products.filter((p) => p.active);
  const totalSprayVolume =
    workOrder.targetSprayVolumePerHa != null
      ? calculateSprayVolume(workOrder.targetSprayVolumePerHa, workOrder.plannedAreaHa)
      : null;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <Link href="/mis-trabajos" className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" />
        Mis trabajos
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight">{formatOrderNumber(workOrder.orderNumber)}</h1>
      </div>

      {workOrder.status === "in_progress" && execution ? (
        <ExecutionScreen workOrder={workOrder} execution={execution} allProducts={allProducts} />
      ) : null}

      {(workOrder.status === "pending_review" || workOrder.status === "completed") && execution ? (
        <>
          <Card className="border-blue-500/40 bg-blue-500/5">
            <CardContent className="flex flex-col gap-1 pt-6">
              <Badge className="w-fit">
                <ClipboardCheck data-icon="inline-start" />
                Aplicación finalizada
              </Badge>
              <p className="text-lg font-semibold">
                {workOrder.fieldName} -- {workOrder.plotName}
              </p>
              <p className="text-sm text-muted-foreground">Pendiente de revisión</p>
            </CardContent>
          </Card>
          <ExecutionPanel execution={execution} status={workOrder.status} />
        </>
      ) : null}

      {workOrder.status === "pending" ? (
        <>
          <Card>
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Campo</p>
                <p className="text-sm font-medium">{workOrder.fieldName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lote</p>
                <p className="text-sm font-medium">{workOrder.plotName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cultivo</p>
                <p className="text-sm font-medium">{workOrder.cropName ?? "-"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Superficie prevista</p>
                <p className="text-sm font-medium">{workOrder.plannedAreaHa} ha</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="text-sm font-medium">{formatDate(workOrder.scheduledDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tipo de aplicación</p>
                <p className="text-sm font-medium">{APPLICATION_METHOD_LABELS[workOrder.applicationMethod]}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receta</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {workOrder.products.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta orden todavía no tiene productos cargados.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Dosis</TableHead>
                        <TableHead>Cant. prevista</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workOrder.products.map((p) => {
                        const quantity = calculateTheoreticalQuantity(p.doseValue, p.doseUnit, workOrder.plannedAreaHa);
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{p.productName}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.doseValue} {DOSE_UNIT_LABELS[p.doseUnit]}
                            </TableCell>
                            <TableCell className="text-sm font-medium tabular-nums">{formatQuantity(quantity)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
              {totalSprayVolume != null ? (
                <p className="text-sm text-muted-foreground">
                  Caldo total previsto:{" "}
                  <span className="font-medium text-foreground">{formatLiters(totalSprayVolume)}</span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          {workOrder.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observaciones del ingeniero</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{workOrder.notes}</p>
              </CardContent>
            </Card>
          ) : null}

          <StartApplicationButton workOrderId={workOrder.id} orderNumber={workOrder.orderNumber} />
        </>
      ) : null}

      {workOrder.status === "completed" && !execution ? (
        <Card>
          <CardContent className="flex items-center gap-2 pt-6">
            <CheckCircle2 className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Esta orden ya fue finalizada.</p>
          </CardContent>
        </Card>
      ) : null}

      {(workOrder.status === "draft" || workOrder.status === "cancelled") ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Esta orden todavía no está lista para ejecutar (estado: {workOrder.status}).
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
