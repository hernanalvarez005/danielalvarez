"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPinned, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveBadge } from "@/components/masters/active-badge";
import { ActiveToggleButton } from "@/components/masters/active-toggle-button";
import { ListToolbar, type StatusFilter } from "@/components/masters/list-toolbar";
import { setFieldActive } from "@/lib/masters/fields-actions";
import type { FieldListItem } from "@/lib/masters/fields";

export function FieldsList({ fields }: { fields: FieldListItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fields.filter((f) => {
      if (status === "active" && !f.active) return false;
      if (status === "inactive" && f.active) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q) || f.customerName.toLowerCase().includes(q);
    });
  }, [fields, search, status]);

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <EmptyState
            icon={MapPinned}
            title="Todavía no hay campos"
            description="Los campos se cargan desde la ficha de un cliente, o creando uno nuevo acá."
          />
          <Button nativeButton={false} render={<Link href="/campos/nuevo"><Plus className="size-4" />Nuevo campo</Link>} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por campo o cliente..."
        status={status}
        onStatusChange={setStatus}
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No encontramos campos con ese criterio.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Lotes</TableHead>
                  <TableHead>Superficie de referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Link href={`/campos/${f.id}`} className="font-medium hover:underline">
                        {f.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Link href={`/clientes/${f.customerId}`} className="hover:underline">
                        {f.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>{f.plotsCount}</TableCell>
                    <TableCell>{f.totalAreaHa != null ? `${f.totalAreaHa} ha` : "-"}</TableCell>
                    <TableCell>
                      <ActiveBadge active={f.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href={`/campos/${f.id}`}>Ver</Link>} />
                        <ActiveToggleButton
                          active={f.active}
                          onToggle={setFieldActive.bind(null, f.id, !f.active)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((f) => (
              <Card key={f.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/campos/${f.id}`} className="font-medium hover:underline">
                        {f.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{f.customerName}</p>
                    </div>
                    <ActiveBadge active={f.active} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {f.plotsCount} lote{f.plotsCount === 1 ? "" : "s"}
                    {f.totalAreaHa != null ? ` · ${f.totalAreaHa} ha` : ""}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      nativeButton={false} render={<Link href={`/campos/${f.id}`}>Ver</Link>}
                    />
                    <ActiveToggleButton active={f.active} onToggle={setFieldActive.bind(null, f.id, !f.active)} />
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
