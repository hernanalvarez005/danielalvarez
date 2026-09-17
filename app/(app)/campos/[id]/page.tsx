import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, Sprout } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveBadge } from "@/components/masters/active-badge";
import { ActiveToggleButton } from "@/components/masters/active-toggle-button";
import { PlotFormSheet } from "@/components/masters/plot-form-sheet";
import { getField, listFieldPlots } from "@/lib/masters/fields";
import { setFieldActive } from "@/lib/masters/fields-actions";
import { setPlotActive } from "@/lib/masters/plots-actions";

export default async function CampoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [field, plots] = await Promise.all([getField(id), listFieldPlots(id)]);
  if (!field) notFound();

  const totalArea = plots
    .filter((p) => p.active && p.areaHa != null)
    .reduce((sum, p) => sum + Number(p.areaHa), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={field.name}
          description={
            <>
              <Link href={`/clientes/${field.customerId}`} className="hover:underline">
                {field.customerName}
              </Link>
              {field.locality ? ` · ${field.locality}` : ""}
              {field.province ? `, ${field.province}` : ""}
            </>
          }
        />
        <div className="flex gap-2">
          <ActiveToggleButton
            active={field.active}
            onToggle={setFieldActive.bind(null, field.id, !field.active)}
          />
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/campos/${field.id}/editar`}>
                <Pencil className="size-4" />
                Editar
              </Link>
            }
          />
        </div>
      </div>

      {field.notes ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Notas</p>
            <p className="text-sm whitespace-pre-wrap">{field.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Lotes {plots.length > 0 ? `(${plots.length}${totalArea > 0 ? `, ${totalArea} ha` : ""})` : null}
          </CardTitle>
          <PlotFormSheet
            fieldId={field.id}
            trigger={
              <Button size="sm">
                <Plus className="size-4" />
                Nuevo lote
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {plots.length === 0 ? (
            <EmptyState
              icon={Sprout}
              title="Todavía no hay lotes"
              description="Agregá el primer lote de este campo."
            />
          ) : (
            <div className="flex flex-col divide-y">
              {plots.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.areaHa != null ? `${p.areaHa} ha` : "Superficie sin cargar"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ActiveBadge active={p.active} />
                    <PlotFormSheet
                      fieldId={field.id}
                      plot={p}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    <ActiveToggleButton
                      active={p.active}
                      onToggle={setPlotActive.bind(null, p.id, field.id, !p.active)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
