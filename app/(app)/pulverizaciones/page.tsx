import { SprayCan } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default function PulverizacionesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pulverizaciones"
        description="Órdenes de trabajo, recetas, ejecución y conciliación de pulverizaciones."
      />
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={SprayCan}
            title="Todavía no hay órdenes de pulverización"
            description="Este es el primer módulo operativo de la plataforma. La creación de órdenes, recetas, cargas de tanque y conciliación se incorporan en la próxima etapa."
          />
        </CardContent>
      </Card>
    </div>
  );
}
