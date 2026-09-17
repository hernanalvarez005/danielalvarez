import { MapPinned } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default function CamposPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Campos y lotes" description="Campos y lotes donde se realizan las labores." />
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={MapPinned}
            title="Todavía no hay campos cargados"
            description="La gestión de campos y lotes se incorpora junto con el módulo de Pulverizaciones."
          />
        </CardContent>
      </Card>
    </div>
  );
}
