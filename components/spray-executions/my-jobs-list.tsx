"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { WorkOrderStatus } from "@/lib/spray-orders/constants";
import type { WorkOrderListItem } from "@/lib/spray-orders/queries";

type JobTab = "pending" | "in_progress" | "recent";

const TABS: { value: JobTab; label: string }[] = [
  { value: "pending", label: "Pendientes" },
  { value: "in_progress", label: "En curso" },
  { value: "recent", label: "Finalizadas" },
];

const TAB_STATUSES: Record<JobTab, WorkOrderStatus[]> = {
  pending: ["pending"],
  in_progress: ["in_progress"],
  recent: ["pending_review", "completed"],
};

function formatDate(value: string | null): string {
  if (!value) return "Sin fecha";
  const date = new Date(`${value}T00:00:00`);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Hoy";
  return date.toLocaleDateString("es-AR");
}

export function MyJobsList({ orders }: { orders: WorkOrderListItem[] }) {
  const [tab, setTab] = useState<JobTab>("pending");

  const actionable = useMemo(
    () => orders.filter((o) => o.status === "pending" || o.status === "in_progress" || o.status === "pending_review" || o.status === "completed"),
    [orders],
  );

  const filtered = useMemo(
    () => actionable.filter((o) => TAB_STATUSES[tab].includes(o.status)),
    [actionable, tab],
  );

  if (actionable.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={ClipboardList}
            title="No tenés trabajos asignados"
            description="Cuando te asignen una orden de pulverización, la vas a ver acá."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as JobTab)}>
        <TabsList className="w-full">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No hay trabajos en esta categoría.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((o) => (
            <Link key={o.id} href={`/mis-trabajos/${o.id}`}>
              <Card>
                <CardContent className="flex flex-col gap-1.5 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-base font-semibold">{o.fieldName}</p>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">{o.plotName}</p>
                  <p className="text-sm">
                    {o.cropName ?? "Sin cultivo"} -- {o.plannedAreaHa} ha
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDate(o.scheduledDate)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
