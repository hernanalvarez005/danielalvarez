"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, SprayCan, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatOrderNumber, type WorkOrderStatus } from "@/lib/spray-orders/constants";
import type { WorkOrderListItem } from "@/lib/spray-orders/queries";

const STATUS_TABS: { value: "all" | WorkOrderStatus; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "draft", label: "Borradores" },
  { value: "pending", label: "Pendientes" },
  { value: "in_progress", label: "En ejecución" },
  { value: "pending_review", label: "Para revisar" },
  { value: "observed", label: "Observadas" },
  { value: "completed", label: "Finalizadas" },
  { value: "cancelled", label: "Canceladas" },
];

const ALL_VALUE = "__all__";

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("es-AR");
}

export function WorkOrdersList({
  orders,
  canCreate = true,
}: {
  orders: WorkOrderListItem[];
  canCreate?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | WorkOrderStatus>("all");
  const [campaign, setCampaign] = useState(ALL_VALUE);
  const [applicator, setApplicator] = useState(ALL_VALUE);

  const campaignOptions = useMemo(
    () => [...new Set(orders.map((o) => o.campaignName).filter((v): v is string => v !== null))].sort(),
    [orders],
  );
  const applicatorOptions = useMemo(
    () => [...new Set(orders.map((o) => o.applicatorName).filter((v): v is string => v !== null))].sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (campaign !== ALL_VALUE && o.campaignName !== campaign) return false;
      if (applicator !== ALL_VALUE && o.applicatorName !== applicator) return false;
      if (!q) return true;
      return (
        formatOrderNumber(o.orderNumber).toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.fieldName.toLowerCase().includes(q) ||
        o.plotName.toLowerCase().includes(q)
      );
    });
  }, [orders, search, status, campaign, applicator]);

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <EmptyState
            icon={SprayCan}
            title="Todavía no hay órdenes de pulverización"
            description="Creá la primera orden para planificar una aplicación."
          />
          {canCreate ? (
            <Button
              nativeButton={false}
              render={
                <Link href="/pulverizaciones/nueva">
                  <Plus className="size-4" />
                  Nueva orden
                </Link>
              }
            />
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Tabs value={status} onValueChange={(v) => setStatus(v as "all" | WorkOrderStatus)}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por OT, cliente, campo o lote..."
            className="pl-8"
          />
        </div>

        {campaignOptions.length > 0 ? (
          <Select
            value={campaign}
            items={[{ value: ALL_VALUE, label: "Todas las campañas" }, ...campaignOptions.map((c) => ({ value: c, label: c }))]}
            onValueChange={(v) => setCampaign(v as string)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas las campañas</SelectItem>
              {campaignOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {applicatorOptions.length > 0 ? (
          <Select
            value={applicator}
            items={[{ value: ALL_VALUE, label: "Todos los aplicadores" }, ...applicatorOptions.map((a) => ({ value: a, label: a }))]}
            onValueChange={(v) => setApplicator(v as string)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los aplicadores</SelectItem>
              {applicatorOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No encontramos órdenes con ese criterio.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OT</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente / Campo</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Cultivo</TableHead>
                  <TableHead>Ha</TableHead>
                  <TableHead>Aplicador</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <Link href={`/pulverizaciones/${o.id}`} className="font-medium hover:underline">
                        {formatOrderNumber(o.orderNumber)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(o.scheduledDate)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{o.customerName}</div>
                      <div className="text-xs text-muted-foreground">{o.fieldName}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.plotName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.cropName ?? "-"}</TableCell>
                    <TableCell className="text-sm tabular-nums">{o.plannedAreaHa}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{o.applicatorName ?? "-"}</TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((o) => (
              <Link key={o.id} href={`/pulverizaciones/${o.id}`}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium">{formatOrderNumber(o.orderNumber)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {o.customerName} · {o.fieldName} · {o.plotName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {o.cropName ?? "Sin cultivo"} · {o.plannedAreaHa} ha
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(o.scheduledDate)}
                      {o.applicatorName ? ` · ${o.applicatorName}` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
