import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FieldForm } from "@/components/masters/field-form";
import { listActiveCustomerOptions } from "@/lib/masters/fields";
import { createField } from "@/lib/masters/fields-actions";

export default async function NuevoCampoPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>;
}) {
  const [{ clienteId }, customers] = await Promise.all([searchParams, listActiveCustomerOptions()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Nuevo campo" />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <FieldForm
            action={createField}
            customers={customers}
            defaultCustomerId={clienteId}
            cancelHref={clienteId ? `/clientes/${clienteId}` : "/campos"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
