"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveBadge } from "@/components/masters/active-badge";
import { ActiveToggleButton } from "@/components/masters/active-toggle-button";
import { ListToolbar, type StatusFilter } from "@/components/masters/list-toolbar";
import { setCustomerActive } from "@/lib/masters/customers-actions";
import type { CustomerListItem } from "@/lib/masters/customers";

export function CustomersList({ customers }: { customers: CustomerListItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (status === "active" && !c.active) return false;
      if (status === "inactive" && c.active) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.legalName ?? "").toLowerCase().includes(q) ||
        (c.taxId ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, search, status]);

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <EmptyState
            icon={Users}
            title="Todavía no hay clientes"
            description="Cargá tu primer cliente para comenzar a organizar campos y lotes."
          />
          <Button nativeButton={false} render={<Link href="/clientes/nuevo"><Plus className="size-4" />Nuevo cliente</Link>} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar por nombre, razón social o CUIT..."
        status={status}
        onStatusChange={setStatus}
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No encontramos clientes con ese criterio.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Campos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.legalName ? (
                        <div className="text-xs text-muted-foreground">{c.legalName}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.phone || c.email || "-"}
                    </TableCell>
                    <TableCell>{c.fieldsCount}</TableCell>
                    <TableCell>
                      <ActiveBadge active={c.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          nativeButton={false} render={<Link href={`/clientes/${c.id}`}>Ver</Link>}
                        />
                        <ActiveToggleButton
                          active={c.active}
                          onToggle={setCustomerActive.bind(null, c.id, !c.active)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link href={`/clientes/${c.id}`} className="font-medium hover:underline">
                        {c.name}
                      </Link>
                      {c.legalName ? (
                        <p className="text-xs text-muted-foreground">{c.legalName}</p>
                      ) : null}
                    </div>
                    <ActiveBadge active={c.active} />
                  </div>
                  <p className="text-sm text-muted-foreground">{c.phone || c.email || "Sin contacto"}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.fieldsCount} campo{c.fieldsCount === 1 ? "" : "s"}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      nativeButton={false} render={<Link href={`/clientes/${c.id}`}>Ver</Link>}
                    />
                    <ActiveToggleButton
                      active={c.active}
                      onToggle={setCustomerActive.bind(null, c.id, !c.active)}
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
