"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecipeEditor, newRecipeLine, type RecipeLine } from "@/components/spray-orders/recipe-editor";
import { createSprayOrder, updateSprayOrder, type SprayOrderActionInput } from "@/lib/spray-orders/actions";
import { calculateSprayVolume, formatLiters } from "@/lib/spray-orders/calculations";
import { APPLICATION_METHODS, APPLICATION_METHOD_LABELS, type ApplicationMethod } from "@/lib/spray-orders/constants";
import type { SprayOrderFormOptions } from "@/lib/spray-orders/options";
import type { WorkOrderDetail } from "@/lib/spray-orders/queries";

export function WorkOrderForm({
  options,
  workOrder,
}: {
  options: SprayOrderFormOptions;
  workOrder?: WorkOrderDetail;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<"draft" | "confirm" | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [customerId, setCustomerId] = useState(workOrder?.customerId ?? "");
  const [fieldId, setFieldId] = useState(workOrder?.fieldId ?? "");
  const [plotId, setPlotId] = useState(workOrder?.plotId ?? "");
  const [campaignId, setCampaignId] = useState(workOrder?.campaignId ?? "");
  const [cropId, setCropId] = useState(workOrder?.cropId ?? "");
  const [applicatorId, setApplicatorId] = useState(workOrder?.applicatorId ?? "");
  const [scheduledDate, setScheduledDate] = useState(workOrder?.scheduledDate ?? "");
  const [plannedAreaHa, setPlannedAreaHa] = useState(
    workOrder?.plannedAreaHa != null ? String(workOrder.plannedAreaHa) : "",
  );
  const [applicationMethod, setApplicationMethod] = useState<ApplicationMethod>(
    workOrder?.applicationMethod ?? "ground",
  );
  const [targetSprayVolumePerHa, setTargetSprayVolumePerHa] = useState(
    workOrder?.targetSprayVolumePerHa != null ? String(workOrder.targetSprayVolumePerHa) : "",
  );
  const [notes, setNotes] = useState(workOrder?.notes ?? "");
  const [recipeLines, setRecipeLines] = useState<RecipeLine[]>(
    workOrder && workOrder.products.length > 0
      ? workOrder.products.map((p) => ({
          key: p.id,
          productId: p.productId,
          doseValue: String(p.doseValue),
          doseUnit: p.doseUnit,
        }))
      : [newRecipeLine()],
  );

  const availableFields = useMemo(
    () => options.fields.filter((f) => f.customerId === customerId),
    [options.fields, customerId],
  );
  const availablePlots = useMemo(
    () => options.plots.filter((p) => p.fieldId === fieldId),
    [options.plots, fieldId],
  );

  const area = Number(plannedAreaHa) || 0;
  const targetVolume = Number(targetSprayVolumePerHa) || 0;
  const totalSprayVolume =
    targetSprayVolumePerHa.trim() !== "" && targetVolume >= 0 ? calculateSprayVolume(targetVolume, area) : null;

  function handleCustomerChange(value: string) {
    setCustomerId(value);
    setFieldId("");
    setPlotId("");
  }

  function handleFieldChange(value: string) {
    setFieldId(value);
    setPlotId("");
  }

  function handlePlotChange(value: string) {
    setPlotId(value);
    const plot = options.plots.find((p) => p.id === value);
    if (plot?.areaHa != null) {
      setPlannedAreaHa(String(plot.areaHa));
    }
  }

  function buildInput(nextIntent: "draft" | "confirm"): SprayOrderActionInput {
    return {
      customerId,
      fieldId,
      plotId,
      campaignId: campaignId || null,
      cropId: cropId || null,
      applicatorId: applicatorId || null,
      scheduledDate: scheduledDate || null,
      plannedAreaHa: area,
      applicationMethod,
      targetSprayVolumePerHa: targetSprayVolumePerHa.trim() !== "" ? targetVolume : null,
      notes: notes || null,
      products: recipeLines
        .filter((l) => l.productId && Number(l.doseValue) > 0)
        .map((l) => ({ productId: l.productId, doseValue: Number(l.doseValue), doseUnit: l.doseUnit })),
      intent: nextIntent,
    };
  }

  function handleSubmit(nextIntent: "draft" | "confirm") {
    setFormError(null);
    setFieldErrors({});
    setIntent(nextIntent);
    startTransition(async () => {
      const input = buildInput(nextIntent);
      const result = workOrder
        ? await updateSprayOrder(workOrder.id, input)
        : await createSprayOrder(input);

      if (result.error) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }

      router.push(`/pulverizaciones/${result.workOrderId}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ubicación / trabajo</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Cliente *</Label>
            <Select
              value={customerId}
              items={options.customers.map((c) => ({ value: c.id, label: c.name }))}
              onValueChange={(v) => handleCustomerChange(v as string)}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná un cliente" />
              </SelectTrigger>
              <SelectContent>
                {options.customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.customerId ? <p className="text-xs text-destructive">{fieldErrors.customerId}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Campo *</Label>
            <Select
              value={fieldId}
              items={availableFields.map((f) => ({ value: f.id, label: f.name }))}
              onValueChange={(v) => handleFieldChange(v as string)}
              disabled={pending || !customerId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={customerId ? "Seleccioná un campo" : "Elegí un cliente primero"} />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.fieldId ? <p className="text-xs text-destructive">{fieldErrors.fieldId}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Lote *</Label>
            <Select
              value={plotId}
              items={availablePlots.map((p) => ({ value: p.id, label: p.name }))}
              onValueChange={(v) => handlePlotChange(v as string)}
              disabled={pending || !fieldId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={fieldId ? "Seleccioná un lote" : "Elegí un campo primero"} />
              </SelectTrigger>
              <SelectContent>
                {availablePlots.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.plotId ? <p className="text-xs text-destructive">{fieldErrors.plotId}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Campaña</Label>
            <Select
              value={campaignId}
              items={options.campaigns.map((c) => ({ value: c.id, label: c.name }))}
              onValueChange={(v) => setCampaignId(v as string)}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná una campaña" />
              </SelectTrigger>
              <SelectContent>
                {options.campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.campaignId ? <p className="text-xs text-destructive">{fieldErrors.campaignId}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Cultivo</Label>
            <Select
              value={cropId}
              items={options.crops.map((c) => ({ value: c.id, label: c.name }))}
              onValueChange={(v) => setCropId(v as string)}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccioná un cultivo" />
              </SelectTrigger>
              <SelectContent>
                {options.crops.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.cropId ? <p className="text-xs text-destructive">{fieldErrors.cropId}</p> : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Aplicador</Label>
            <Select
              value={applicatorId}
              items={options.applicators.map((a) => ({ value: a.id, label: a.name }))}
              onValueChange={(v) => setApplicatorId(v as string)}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                {options.applicators.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Superficie prevista (ha) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={plannedAreaHa}
              onChange={(e) => setPlannedAreaHa(e.target.value)}
              disabled={pending}
            />
            {fieldErrors.plannedAreaHa ? (
              <p className="text-xs text-destructive">{fieldErrors.plannedAreaHa}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Fecha prevista</Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={pending}
            />
            {fieldErrors.scheduledDate ? (
              <p className="text-xs text-destructive">{fieldErrors.scheduledDate}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Tipo de aplicación *</Label>
            <Select
              value={applicationMethod}
              items={APPLICATION_METHODS.map((m) => ({ value: m, label: APPLICATION_METHOD_LABELS[m] }))}
              onValueChange={(v) => setApplicationMethod(v as ApplicationMethod)}
              disabled={pending}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {APPLICATION_METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label>Volumen objetivo (L/ha)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 80"
              value={targetSprayVolumePerHa}
              onChange={(e) => setTargetSprayVolumePerHa(e.target.value)}
              disabled={pending}
            />
            {totalSprayVolume != null ? (
              <p className="text-sm text-muted-foreground">
                Caldo previsto total: <span className="font-medium text-foreground">{formatLiters(totalSprayVolume)}</span>
              </p>
            ) : null}
          </div>

          <RecipeEditor
            products={options.products}
            lines={recipeLines}
            onChange={setRecipeLines}
            areaHa={area}
            error={fieldErrors.products}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Notas para el aplicador o para uso interno..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => handleSubmit("confirm")} disabled={pending}>
          {pending && intent === "confirm" ? "Confirmando..." : "Confirmar orden"}
        </Button>
        <Button type="button" variant="outline" onClick={() => handleSubmit("draft")} disabled={pending}>
          {pending && intent === "draft" ? "Guardando..." : "Guardar borrador"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          onClick={() => router.push(workOrder ? `/pulverizaciones/${workOrder.id}` : "/pulverizaciones")}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
