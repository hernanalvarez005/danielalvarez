import { UserCog } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default function AplicadoresPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Aplicadores" description="Operadores que ejecutan las pulverizaciones en el campo." />
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={UserCog}
            title="Todavía no hay aplicadores cargados"
            description="La gestión de aplicadores se incorpora junto con el módulo de Pulverizaciones."
          />
        </CardContent>
      </Card>
    </div>
  );
}
