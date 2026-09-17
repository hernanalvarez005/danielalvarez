import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerForm } from "@/components/masters/customer-form";
import { createCustomer } from "@/lib/masters/customers-actions";

export default function NuevoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nuevo cliente" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <CustomerForm action={createCustomer} cancelHref="/clientes" />
        </CardContent>
      </Card>
    </div>
  );
}
