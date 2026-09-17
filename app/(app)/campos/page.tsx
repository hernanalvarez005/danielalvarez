import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FieldsList } from "@/components/masters/fields-list";
import { listFields } from "@/lib/masters/fields";

export default async function CamposPage() {
  const fields = await listFields();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageHeader title="Campos y lotes" description="Campos y lotes donde se realizan las labores." />
        {fields.length > 0 ? (
          <Button nativeButton={false} render={<Link href="/campos/nuevo"><Plus className="size-4" />Nuevo campo</Link>} />
        ) : null}
      </div>
      <FieldsList fields={fields} />
    </div>
  );
}
