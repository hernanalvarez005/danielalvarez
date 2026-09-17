import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { WorkOrderForm } from "@/components/spray-orders/work-order-form";
import { getSprayOrderFormOptions } from "@/lib/spray-orders/options";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { can } from "@/lib/permissions/roles";

export default async function NuevaOrdenPage() {
  const authState = await getAuthContext();
  const role = authState.status === "ok" ? authState.context.role : null;
  if (!can(role, "work-orders:create")) {
    redirect("/pulverizaciones");
  }

  const options = await getSprayOrderFormOptions();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nueva orden de pulverización" />
      <WorkOrderForm options={options} />
    </div>
  );
}
