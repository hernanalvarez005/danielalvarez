import { z } from "zod";
import { APPLICATION_METHODS, DOSE_UNITS } from "./constants";

export const reviewDecisionSchema = z
  .object({
    workOrderId: z.uuid(),
    decision: z.enum(["approved", "observed"]),
    notes: z.string().nullable(),
  })
  .refine((data) => data.decision !== "observed" || (data.notes != null && data.notes.trim().length > 0), {
    message: "El comentario es obligatorio para observar una aplicación",
    path: ["notes"],
  });
export type ReviewDecisionInput = z.infer<typeof reviewDecisionSchema>;

export const sprayOrderProductSchema = z.object({
  productId: z.uuid("Elegí un producto"),
  doseValue: z.number().positive("La dosis tiene que ser mayor a 0"),
  doseUnit: z.enum(DOSE_UNITS, { message: "Elegí una unidad válida" }),
});
export type SprayOrderProductFormValue = z.infer<typeof sprayOrderProductSchema>;

const baseObjectSchema = z.object({
  customerId: z.uuid("Seleccioná un cliente"),
  fieldId: z.uuid("Seleccioná un campo"),
  plotId: z.uuid("Seleccioná un lote"),
  campaignId: z.uuid().nullable(),
  cropId: z.uuid().nullable(),
  applicatorId: z.uuid().nullable(),
  scheduledDate: z.string().nullable(),
  plannedAreaHa: z.number().min(0, "Tiene que ser 0 o mayor"),
  applicationMethod: z.enum(APPLICATION_METHODS),
  targetSprayVolumePerHa: z.number().min(0, "Tiene que ser 0 o mayor").nullable(),
  notes: z.string().nullable(),
  products: z.array(sprayOrderProductSchema),
});

function hasNoDuplicateProducts(data: { products: { productId: string }[] }) {
  return new Set(data.products.map((p) => p.productId)).size === data.products.length;
}

const DUPLICATE_PRODUCT_ISSUE: { message: string; path: PropertyKey[] } = {
  message: "No podés repetir el mismo producto en la receta",
  path: ["products"],
};

/** Relaxed: enough to save a draft. Still can't have duplicate products. */
export const sprayOrderDraftSchema = baseObjectSchema.refine(
  hasNoDuplicateProducts,
  DUPLICATE_PRODUCT_ISSUE,
);
export type SprayOrderDraftInput = z.infer<typeof sprayOrderDraftSchema>;

/** Strict: everything required to move a work order from draft to pending. */
export const sprayOrderConfirmSchema = baseObjectSchema
  .extend({
    campaignId: z.uuid("La campaña es obligatoria para confirmar"),
    cropId: z.uuid("El cultivo es obligatorio para confirmar"),
    scheduledDate: z.string().min(1, "La fecha prevista es obligatoria para confirmar"),
    plannedAreaHa: z.number().positive("La superficie tiene que ser mayor a 0"),
  })
  .refine((data) => data.products.length >= 1, {
    message: "Agregá al menos un producto a la receta",
    path: ["products"],
  })
  .refine(hasNoDuplicateProducts, DUPLICATE_PRODUCT_ISSUE);
export type SprayOrderConfirmInput = z.infer<typeof sprayOrderConfirmSchema>;
