import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { WorkOrdersList } from "@/components/spray-orders/work-orders-list";
import { listWorkOrders } from "@/lib/spray-orders/queries";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { can } from "@/lib/permissions/roles";

export default async function PulverizacionesPage() {
  const [orders, authState] = await Promise.all([listWorkOrders(), getAuthContext()]);
  const role = authState.status === "ok" ? authState.context.role : null;
  const canCreate = can(role, "work-orders:create");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader
          title="Pulverizaciones"
          description="Órdenes de trabajo, recetas, ejecución y conciliación de pulverizaciones."
        />
        {canCreate && orders.length > 0 ? (
          <Button
            nativeButton={false}
            render={
              <Link href="/pulverizaciones/nueva">
                <Plus className="size-4" />
                Nueva orden
              </Link>
            }
          />
        ) : null}
      </div>
      <WorkOrdersList orders={orders} canCreate={canCreate} />
    </div>
  );
}
