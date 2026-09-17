import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus, MapPinned } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveBadge } from "@/components/masters/active-badge";
import { ActiveToggleButton } from "@/components/masters/active-toggle-button";
import { getCustomer, listCustomerFields } from "@/lib/masters/customers";
import { setCustomerActive } from "@/lib/masters/customers-actions";

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, fields] = await Promise.all([getCustomer(id), listCustomerFields(id)]);
  if (!customer) notFound();

  const totalPlots = fields.reduce((sum, f) => sum + f.plotsCount, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title={customer.name} />
        <div className="flex gap-2">
          <ActiveToggleButton
            active={customer.active}
            onToggle={setCustomerActive.bind(null, customer.id, !customer.active)}
          />
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link href={`/clientes/${customer.id}/editar`}>
                <Pencil className="size-4" />
                Editar
              </Link>
            }
          />
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <ActiveBadge active={customer.active} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CUIT</p>
            <p className="text-sm font-medium">{customer.taxId || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Teléfono</p>
            <p className="text-sm font-medium">{customer.phone || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{customer.email || "-"}</p>
          </div>
          {customer.legalName ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted-foreground">Razón social</p>
              <p className="text-sm font-medium">{customer.legalName}</p>
            </div>
          ) : null}
          {customer.notes ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-muted-foreground">Notas</p>
              <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Campos {fields.length > 0 ? `(${fields.length}, ${totalPlots} lotes)` : null}
          </CardTitle>
          <Button
            size="sm"
            nativeButton={false}
            render={
              <Link href={`/campos/nuevo?clienteId=${customer.id}`}>
                <Plus className="size-4" />
                Agregar campo
              </Link>
            }
          />
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <EmptyState
              icon={MapPinned}
              title="Todavía no hay campos"
              description="Agregá el primer campo de este cliente para poder cargar sus lotes."
            />
          ) : (
            <div className="flex flex-col divide-y">
              {fields.map((f) => (
                <Link
                  key={f.id}
                  href={`/campos/${f.id}`}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 hover:opacity-80"
                >
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.locality ? `${f.locality} · ` : ""}
                      {f.plotsCount} lote{f.plotsCount === 1 ? "" : "s"}
                      {f.totalAreaHa != null ? ` · ${f.totalAreaHa} ha` : ""}
                    </p>
                  </div>
                  <ActiveBadge active={f.active} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
