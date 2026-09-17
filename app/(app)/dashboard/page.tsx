import { CalendarClock, ClipboardCheck, ListTodo, PlayCircle, Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatCard } from "@/components/dashboard/stat-card";
import { getAuthContext } from "@/lib/auth/get-auth-context";

export default async function DashboardPage() {
  const authState = await getAuthContext();
  const auth = authState.status === "ok" ? authState.context : null;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pendientes" value={0} icon={ListTodo} />
        <StatCard label="En ejecución" value={0} icon={PlayCircle} />
        <StatCard label="Para revisar" value={0} icon={ClipboardCheck} />
        <StatCard label="Hectáreas aplicadas" value={0} icon={Sprout} suffix="ha" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Trabajos de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={CalendarClock}
              title="Todavía no hay trabajos programados"
              description="Cuando el módulo de Pulverizaciones esté activo, acá vas a ver las órdenes de hoy."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requieren revisión</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={ClipboardCheck}
              title="Nada pendiente de revisión"
              description="Las órdenes finalizadas que necesiten conciliación van a aparecer acá."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
