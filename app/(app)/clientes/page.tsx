import { Users } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default function ClientesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Clientes" description="Clientes para los que se ejecutan trabajos." />
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Users}
            title="Todavía no hay clientes cargados"
            description="El alta y administración de clientes se incorpora junto con el módulo de Pulverizaciones."
          />
        </CardContent>
      </Card>
    </div>
  );
}
