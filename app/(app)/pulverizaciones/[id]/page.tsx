import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { CancelOrderDialog } from "@/components/spray-orders/cancel-order-dialog";
import { getWorkOrder } from "@/lib/spray-orders/queries";
import {
  calculateSprayVolume,
  calculateTheoreticalQuantity,
  formatLiters,
  formatQuantity,
} from "@/lib/spray-orders/calculations";
import { APPLICATION_METHOD_LABELS, DOSE_UNIT_LABELS, formatOrderNumber } from "@/lib/spray-orders/constants";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { can } from "@/lib/permissions/roles";

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-AR");
}

export default async function OrdenDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, authState] = await Promise.all([getWorkOrder(id), getAuthContext()]);
  if (!order) notFound();

  const role = authState.status === "ok" ? authState.context.role : null;
  const canManage = can(role, "work-orders:create") && (order.status === "draft" || order.status === "pending");

  const totalSprayVolume =
    order.targetSprayVolumePerHa != null
      ? calculateSprayVolume(order.targetSprayVolumePerHa, order.plannedAreaHa)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <PageHeader title={formatOrderNumber(order.orderNumber)} />
          <StatusBadge status={order.status} />
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link href={`/pulverizaciones/${order.id}/editar`}>
                  <Pencil className="size-4" />
                  Editar
                </Link>
              }
            />
            <CancelOrderDialog workOrderId={order.id} orderNumber={order.orderNumber} />
          </div>
        ) : null}
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Cliente</p>
            <p className="text-sm font-medium">
              <Link href={`/clientes/${order.customerId}`} className="hover:underline">
                {order.customerName}
              </Link>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Campo</p>
            <p className="text-sm font-medium">
              <Link href={`/campos/${order.fieldId}`} className="hover:underline">
                {order.fieldName}
              </Link>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Lote</p>
            <p className="text-sm font-medium">{order.plotName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Superficie prevista</p>
            <p className="text-sm font-medium">{order.plannedAreaHa} ha</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Campaña</p>
            <p className="text-sm font-medium">{order.campaignName ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cultivo</p>
            <p className="text-sm font-medium">{order.cropName ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fecha prevista</p>
            <p className="text-sm font-medium">{formatDate(order.scheduledDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Aplicador</p>
            <p className="text-sm font-medium">{order.applicatorName ?? "Sin asignar"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tipo de aplicación</p>
            <p className="text-sm font-medium">{APPLICATION_METHOD_LABELS[order.applicationMethod]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Volumen objetivo</p>
            <p className="text-sm font-medium">
              {order.targetSprayVolumePerHa != null ? `${order.targetSprayVolumePerHa} L/ha` : "-"}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {order.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta orden todavía no tiene productos cargados.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Dosis</TableHead>
                    <TableHead>Cantidad teórica</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.products.map((p) => {
                    const quantity = calculateTheoreticalQuantity(p.doseValue, p.doseUnit, order.plannedAreaHa);
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
              Caldo previsto: <span className="font-medium text-foreground">{formatLiters(totalSprayVolume)}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      {order.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
