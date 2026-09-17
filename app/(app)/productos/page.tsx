import { Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";

export default function ProductosPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Productos" description="Productos e insumos utilizados en las aplicaciones." />
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Package}
            title="Todavía no hay productos cargados"
            description="El catálogo de productos se incorpora junto con el módulo de Pulverizaciones."
          />
        </CardContent>
      </Card>
    </div>
  );
}
