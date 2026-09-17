import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, ClipboardCheck, Eye, ListTodo, PlayCircle, Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { getDashboardStats } from "@/lib/dashboard/stats";
import { listWorkOrders } from "@/lib/spray-orders/queries";
import { getSprayExecution } from "@/lib/spray-executions/queries";
import { getWorkOrderReconciliation } from "@/lib/spray-orders/reconciliation-data";
import { formatOrderNumber } from "@/lib/spray-orders/constants";

function formatDateTime(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default async function DashboardPage() {
  const authState = await getAuthContext();
  const auth = authState.status === "ok" ? authState.context : null;

  // Applicators work from their own mobile screen, not this backoffice
  // dashboard -- /dashboard is still the default post-login redirect
  // (it doesn't know the role yet), so this is where the role-aware
  // landing actually happens.
  if (auth?.role === "applicator") {
    redirect("/mis-trabajos");
  }

  const [stats, orders] = await Promise.all([getDashboardStats(), listWorkOrders()]);

  const today = new Date().toISOString().slice(0, 10);
  const todaysJobs = orders.filter((o) => o.scheduledDate === today && o.status !== "cancelled" && o.status !== "draft");
  const pendingReviewOrders = orders.filter((o) => o.status === "pending_review");

  const pendingReviewDetails = await Promise.all(
    pendingReviewOrders.map(async (o) => {
      const [execution, reconciliation] = await Promise.all([
        getSprayExecution(o.id),
        getWorkOrderReconciliation(o.id),
      ]);
      return {
        order: o,
        finishedAt: execution?.finishedAt ?? null,
        incidentsCount: reconciliation?.incidents.length ?? 0,
      };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola{auth?.fullName ? `, ${auth.fullName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumen general de la operación de pulverizaciones.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Pendientes" value={stats.pendingCount} icon={ListTodo} />
        <StatCard label="En ejecución" value={stats.inProgressCount} icon={PlayCircle} />
        <StatCard label="Para revisar" value={stats.pendingReviewCount} icon={ClipboardCheck} />
        <StatCard label="Observadas" value={stats.observedCount} icon={Eye} />
        <StatCard label="Hectáreas aplicadas" value={stats.appliedHectares} icon={Sprout} suffix="ha" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trabajos de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysJobs.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No hay trabajos programados para hoy"
                description="Las órdenes con fecha prevista de hoy van a aparecer acá."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {todaysJobs.map((o) => (
                  <Link
                    key={o.id}
                    href={`/pulverizaciones/${o.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="font-medium">{formatOrderNumber(o.orderNumber)}</span>
                    <span className="text-muted-foreground">
                      {o.fieldName} · {o.plotName} · {o.applicatorName ?? "Sin asignar"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requieren revisión</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReviewDetails.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Nada pendiente de revisión"
                description="Las órdenes finalizadas que necesiten conciliación van a aparecer acá."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {pendingReviewDetails.map(({ order, finishedAt, incidentsCount }) => (
                  <Link
                    key={order.id}
                    href={`/pulverizaciones/${order.id}`}
                    className="flex flex-col gap-0.5 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formatOrderNumber(order.orderNumber)}</span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(finishedAt)}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {order.fieldName} · {order.plotName} · {order.applicatorName ?? "Sin asignar"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {incidentsCount > 0
                        ? `${incidentsCount} ${incidentsCount === 1 ? "incidencia" : "incidencias"} detectadas`
                        : "Sin incidencias detectadas"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
