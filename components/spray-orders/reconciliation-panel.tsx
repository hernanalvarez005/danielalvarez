import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CLASSIFICATION_LABELS,
  formatDoseInRecipeUnit,
  formatDosePerHa,
  formatSignedNumber,
  formatSignedPercent,
  formatSignedQuantity,
  type ProductReconciliationItem,
  type ReconciliationSummary,
  type ToleranceClassification,
} from "@/lib/spray-orders/reconciliation";
import { formatQuantity } from "@/lib/spray-orders/calculations";
import { formatQuantityTotals } from "@/lib/spray-executions/calculations";
import type { VariantProps } from "class-variance-authority";

const CLASSIFICATION_VARIANT: Record<ToleranceClassification, VariantProps<typeof badgeVariants>["variant"]> = {
  within_tolerance: "secondary",
  review: "warning",
  no_comparison_possible: "outline",
};

function ClassificationBadge({ classification }: { classification: ToleranceClassification }) {
  return <Badge variant={CLASSIFICATION_VARIANT[classification]}>{CLASSIFICATION_LABELS[classification]}</Badge>;
}

const PRODUCT_STATUS_LABEL: Record<ProductReconciliationItem["status"], string | null> = {
  compared: null,
  not_used: "Previsto, sin registro de uso",
  unplanned: "No estaba en la receta",
  incompatible_units: "Unidades incompatibles",
};

function ProductStatusNote({ item }: { item: ProductReconciliationItem }) {
  const label = PRODUCT_STATUS_LABEL[item.status];
  if (!label) return null;
  return (
    <Badge variant="outline" className="text-[10px] font-normal">
      {label}
    </Badge>
  );
}

function formatIndicatedDose(item: ProductReconciliationItem): string {
  if (item.doseValue == null || item.doseUnit == null) return "-";
  return `${item.doseValue} ${item.doseUnit.replace("_ha", "/ha")}`;
}

function formatEffectiveDose(item: ProductReconciliationItem): string {
  if (item.effectiveDosePerHa == null) return "-";
  // Show in the recipe's own finer unit (cc/g) when there is one, so an
  // engineer who dosed in cc/ha doesn't have to mentally convert L/ha.
  if (item.doseUnit) return formatDoseInRecipeUnit(item.effectiveDosePerHa.value, item.doseUnit);
  return formatDosePerHa(item.effectiveDosePerHa.value, item.effectiveDosePerHa.unit);
}

function formatDifference(item: ProductReconciliationItem): string {
  if (item.difference == null) return "-";
  const valuePart = formatSignedQuantity(item.difference.value, item.plannedQuantity?.unit ?? "L");
  const percentPart = item.difference.percent != null ? ` (${formatSignedPercent(item.difference.percent)})` : "";
  return `${valuePart}${percentPart}`;
}

export function ReconciliationPanel({ summary }: { summary: ReconciliationSummary }) {
  const { area, sprayVolume, products, incidents } = summary;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conciliación</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm font-medium">
            {incidents.length > 0
              ? `${incidents.length} ${incidents.length === 1 ? "punto" : "puntos"} para revisar`
              : "Sin diferencias fuera de los parámetros configurados."}
          </p>
          {incidents.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {incidents.map((incident) => (
                <li key={incident}>- {incident}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Superficie</p>
                <ClassificationBadge classification={area.classification} />
              </div>
              <p className="text-sm text-muted-foreground">
                Prevista <span className="font-medium text-foreground">{area.plannedAreaHa} ha</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Real <span className="font-medium text-foreground">{area.actualAreaHa} ha</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Diferencia{" "}
                <span className="font-medium text-foreground">
                  {formatSignedNumber(area.differenceHa)} ha
                  {area.differencePercent != null ? ` (${formatSignedPercent(area.differencePercent)})` : ""}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Caldo</p>
                <ClassificationBadge classification={sprayVolume.classification} />
              </div>
              <p className="text-sm text-muted-foreground">
                Objetivo para {area.actualAreaHa} ha{" "}
                <span className="font-medium text-foreground">
                  {sprayVolume.expectedTotalLiters != null ? `${sprayVolume.expectedTotalLiters} L` : "-"}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Real <span className="font-medium text-foreground">{sprayVolume.actualTotalLiters} L</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Diferencia{" "}
                <span className="font-medium text-foreground">
                  {sprayVolume.differenceLiters != null
                    ? `${formatSignedQuantity(sprayVolume.differenceLiters, "L")}${
                        sprayVolume.differencePercent != null ? ` (${formatSignedPercent(sprayVolume.differencePercent)})` : ""
                      }`
                    : "-"}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay productos que conciliar.</p>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Dosis indicada</TableHead>
                      <TableHead>Plan original</TableHead>
                      <TableHead>Esperado real</TableHead>
                      <TableHead>Utilizado</TableHead>
                      <TableHead>Dosis efectiva</TableHead>
                      <TableHead>Diferencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.productName}
                            <ProductStatusNote item={item} />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatIndicatedDose(item)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.plannedQuantity ? formatQuantity(item.plannedQuantity) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.expectedQuantity ? formatQuantity(item.expectedQuantity) : "-"}
                        </TableCell>
                        <TableCell className="text-sm font-medium tabular-nums">
                          {formatQuantityTotals(item.actualQuantity)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{formatEffectiveDose(item)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{formatDifference(item)}</TableCell>
                        <TableCell>
                          <ClassificationBadge classification={item.classification} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 md:hidden">
                {products.map((item) => (
                  <div key={item.productId} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-semibold uppercase">{item.productName}</p>
                      <ClassificationBadge classification={item.classification} />
                    </div>
                    <ProductStatusNote item={item} />
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Indicado</p>
                        <p>{formatIndicatedDose(item)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Esperado para {area.actualAreaHa} ha</p>
                        <p>{item.expectedQuantity ? formatQuantity(item.expectedQuantity) : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Utilizado</p>
                        <p className="font-medium">{formatQuantityTotals(item.actualQuantity)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Dosis efectiva</p>
                        <p>{formatEffectiveDose(item)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground">Diferencia</p>
                        <p>{formatDifference(item)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
