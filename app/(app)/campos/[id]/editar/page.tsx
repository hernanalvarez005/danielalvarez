import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { FieldForm } from "@/components/masters/field-form";
import { getField, listActiveCustomerOptions } from "@/lib/masters/fields";
import { updateField } from "@/lib/masters/fields-actions";

export default async function EditarCampoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [field, customers] = await Promise.all([getField(id), listActiveCustomerOptions()]);
  if (!field) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Editar ${field.name}`} />
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <FieldForm
            action={updateField.bind(null, id)}
            field={field}
            customers={customers}
            cancelHref={`/campos/${id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
