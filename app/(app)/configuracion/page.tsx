import { CalendarRange, Plus, Settings, Sprout } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveBadge } from "@/components/masters/active-badge";
import { ActiveToggleButton } from "@/components/masters/active-toggle-button";
import { CampaignFormSheet } from "@/components/masters/campaign-form-sheet";
import { CropFormSheet } from "@/components/masters/crop-form-sheet";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { getAuthContext } from "@/lib/auth/get-auth-context";
import { listCampaigns } from "@/lib/masters/campaigns";
import { setCampaignActive } from "@/lib/masters/campaigns-actions";
import { listCrops } from "@/lib/masters/crops";
import { setCropActive } from "@/lib/masters/crops-actions";

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("es-AR");
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start ?? end!);
}

export default async function ConfiguracionPage() {
  const [authState, campaigns, crops] = await Promise.all([getAuthContext(), listCampaigns(), listCrops()]);
  const auth = authState.status === "ok" ? authState.context : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configuración" description="Datos de la organización y preferencias del sistema." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organización</CardTitle>
          <CardDescription>{auth?.organizationName}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Settings}
            title="Gestión de usuarios y roles"
            description={`Tu rol actual es ${auth ? ROLE_LABELS[auth.role] : "-"}. La administración completa de usuarios, roles e integraciones se incorpora en una próxima etapa.`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Campañas</CardTitle>
          <CampaignFormSheet
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Nueva campaña
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="Todavía no hay campañas"
              description="Creá la campaña agrícola actual, por ejemplo 2026/27."
            />
          ) : (
            <div className="flex flex-col divide-y">
              {campaigns.map((c) => {
                const range = formatDateRange(c.startDate, c.endDate);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      {range ? <p className="text-xs text-muted-foreground">{range}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <ActiveBadge active={c.active} />
                      <CampaignFormSheet
                        campaign={c}
                        trigger={
                          <Button variant="ghost" size="sm">
                            Editar
                          </Button>
                        }
                      />
                      <ActiveToggleButton
                        active={c.active}
                        onToggle={setCampaignActive.bind(null, c.id, !c.active)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Cultivos</CardTitle>
          <CropFormSheet
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="size-4" />
                Nuevo cultivo
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {crops.length === 0 ? (
            <EmptyState
              icon={Sprout}
              title="Todavía no hay cultivos"
              description="Creá el catálogo de cultivos que vas a usar en las órdenes de trabajo."
            />
          ) : (
            <div className="flex flex-col divide-y">
              {crops.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <p className="font-medium">{c.name}</p>
                  <div className="flex items-center gap-2">
                    <ActiveBadge active={c.active} />
                    <CropFormSheet
                      crop={c}
                      trigger={
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      }
                    />
                    <ActiveToggleButton active={c.active} onToggle={setCropActive.bind(null, c.id, !c.active)} />
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
