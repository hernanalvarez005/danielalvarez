import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { WorkOrderForm } from "@/components/spray-orders/work-order-form";
import { getSprayOrderFormOptions } from "@/lib/spray-orders/options";
import { getWorkOrder } from "@/lib/spray-orders/queries";
import { formatOrderNumber } from "@/lib/spray-orders/constants";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { can } from "@/lib/permissions/roles";

export default async function EditarOrdenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workOrder, options, authState] = await Promise.all([
    getWorkOrder(id),
    getSprayOrderFormOptions(),
    getAuthContext(),
  ]);
  if (!workOrder) notFound();

  const role = authState.status === "ok" ? authState.context.role : null;
  if (!can(role, "work-orders:create") || (workOrder.status !== "draft" && workOrder.status !== "pending")) {
    redirect(`/pulverizaciones/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar ${formatOrderNumber(workOrder.orderNumber)}`} />
      <WorkOrderForm options={options} workOrder={workOrder} />
    </div>
  );
}
