"use client";

import { useMemo, useState } from "react";
import { Plus, UserCog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveBadge } from "@/components/masters/active-badge";
import { ActiveToggleButton } from "@/components/masters/active-toggle-button";
import { ListToolbar, type StatusFilter } from "@/components/masters/list-toolbar";
import { ApplicatorFormSheet } from "@/components/masters/applicator-form-sheet";
import { setApplicatorActive } from "@/lib/masters/applicators-actions";
import type { ApplicatorItem, OrgUserOption } from "@/lib/masters/applicators";

export function ApplicatorsList({
  applicators,
  userOptions,
}: {
  applicators: ApplicatorItem[];
  userOptions: OrgUserOption[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applicators.filter((a) => {
      if (status === "active" && !a.active) return false;
      if (status === "inactive" && a.active) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q);
    });
  }, [applicators, search, status]);

  if (applicators.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <EmptyState
            icon={UserCog}
            title="Todavía no hay aplicadores"
            description="Cargá al primer aplicador que ejecuta trabajos en el campo."
          />
          <ApplicatorFormSheet
            userOptions={userOptions}
            trigger={
              <Button>
                <Plus className="size-4" />
                Nuevo aplicador
              </Button>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar aplicador..."
        status={status}
        onStatusChange={setStatus}
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No encontramos aplicadores con ese criterio.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Usuario vinculado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.phone || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.linkedUserName ?? "-"}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={a.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ApplicatorFormSheet
                          applicator={a}
                          userOptions={userOptions}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Editar
                            </Button>
                          }
                        />
                        <ActiveToggleButton
                          active={a.active}
                          onToggle={setApplicatorActive.bind(null, a.id, !a.active)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.phone || "Sin teléfono"}</p>
                    </div>
                    <ActiveBadge active={a.active} />
                  </div>
                  {a.linkedUserName ? (
                    <p className="text-xs text-muted-foreground">Usuario: {a.linkedUserName}</p>
                  ) : null}
                  <div className="flex gap-2 pt-1">
                    <ApplicatorFormSheet
                      applicator={a}
                      userOptions={userOptions}
                      trigger={
                        <Button variant="outline" size="sm" className="flex-1">
                          Editar
                        </Button>
                      }
                    />
                    <ActiveToggleButton
                      active={a.active}
                      onToggle={setApplicatorActive.bind(null, a.id, !a.active)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
