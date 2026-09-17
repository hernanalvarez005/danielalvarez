import { PageHeader } from "@/components/shared/page-header";
import { MyJobsList } from "@/components/spray-executions/my-jobs-list";
import { listWorkOrders } from "@/lib/spray-orders/queries";

export default async function MisTrabajosPage() {
  // RLS already scopes this to the current applicator's assigned work
  // orders (or to everything, for admin/engineer) -- no extra filtering
  // needed here.
  const orders = await listWorkOrders();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mis trabajos" />
      <MyJobsList orders={orders} />
    </div>
  );
}
