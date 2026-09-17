"use client";

import { useMemo, useState } from "react";
import { Package, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveBadge } from "@/components/masters/active-badge";
import { ActiveToggleButton } from "@/components/masters/active-toggle-button";
import { ListToolbar, type StatusFilter } from "@/components/masters/list-toolbar";
import { ProductFormSheet } from "@/components/masters/product-form-sheet";
import { setProductActive } from "@/lib/masters/products-actions";
import { PRODUCT_UNIT_LABELS } from "@/lib/masters/schemas";
import type { ProductItem } from "@/lib/masters/products";

export function ProductsList({ products }: { products: ProductItem[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (status === "active" && !p.active) return false;
      if (status === "inactive" && p.active) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [products, search, status]);

  if (products.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <EmptyState
            icon={Package}
            title="Todavía no hay productos"
            description="Cargá el primer producto del catálogo para poder usarlo después en recetas."
          />
          <ProductFormSheet
            trigger={
              <Button>
                <Plus className="size-4" />
                Nuevo producto
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
        searchPlaceholder="Buscar producto..."
        status={status}
        onStatusChange={setStatus}
      />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No encontramos productos con ese criterio.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Unidad predeterminada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {PRODUCT_UNIT_LABELS[p.defaultUnit]}
                    </TableCell>
                    <TableCell>
                      <ActiveBadge active={p.active} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ProductFormSheet
                          product={p}
                          trigger={
                            <Button variant="ghost" size="sm">
                              Editar
                            </Button>
                          }
                        />
                        <ActiveToggleButton
                          active={p.active}
                          onToggle={setProductActive.bind(null, p.id, !p.active)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex flex-col gap-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{PRODUCT_UNIT_LABELS[p.defaultUnit]}</p>
                    </div>
                    <ActiveBadge active={p.active} />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <ProductFormSheet
                      product={p}
                      trigger={
                        <Button variant="outline" size="sm" className="flex-1">
                          Editar
                        </Button>
                      }
                    />
                    <ActiveToggleButton active={p.active} onToggle={setProductActive.bind(null, p.id, !p.active)} />
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
