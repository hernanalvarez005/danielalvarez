import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "@/components/masters/customer-form";
import { getCustomer } from "@/lib/masters/customers";
import { updateCustomer } from "@/lib/masters/customers-actions";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar ${customer.name}`} />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <CustomerForm action={updateCustomer.bind(null, id)} customer={customer} cancelHref={`/clientes/${id}`} />
        </CardContent>
      </Card>
    </div>
  );
}
