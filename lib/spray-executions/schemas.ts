import { z } from "zod";
import { LOAD_PRODUCT_UNITS } from "./constants";

export const sprayLoadProductSchema = z.object({
  productId: z.uuid("Elegí un producto"),
  quantityValue: z.number().positive("La cantidad tiene que ser mayor a 0"),
  quantityUnit: z.enum(LOAD_PRODUCT_UNITS, { message: "Elegí una unidad válida" }),
});
export type SprayLoadProductFormValue = z.infer<typeof sprayLoadProductSchema>;

function hasNoDuplicateProducts(data: { products: { productId: string }[] }) {
  return new Set(data.products.map((p) => p.productId)).size === data.products.length;
}

export const registerSprayLoadSchema = z
  .object({
    workOrderId: z.uuid(),
    clientRequestId: z.uuid(),
    waterLiters: z.number().positive("El agua tiene que ser mayor a 0"),
    notes: z.string().nullable(),
    products: z.array(sprayLoadProductSchema),
  })
  .refine(hasNoDuplicateProducts, {
    message: "No podés repetir el mismo producto en la carga",
    path: ["products"],
  });
export type RegisterSprayLoadInput = z.infer<typeof registerSprayLoadSchema>;

export const updateSprayLoadSchema = z
  .object({
    loadId: z.uuid(),
    waterLiters: z.number().positive("El agua tiene que ser mayor a 0"),
    notes: z.string().nullable(),
    products: z.array(sprayLoadProductSchema),
  })
  .refine(hasNoDuplicateProducts, {
    message: "No podés repetir el mismo producto en la carga",
    path: ["products"],
  });
export type UpdateSprayLoadInput = z.infer<typeof updateSprayLoadSchema>;

export const finishApplicationSchema = z.object({
  workOrderId: z.uuid(),
  actualAreaHa: z.number().positive("La superficie realizada tiene que ser mayor a 0"),
  notes: z.string().nullable(),
});
export type FinishApplicationInput = z.infer<typeof finishApplicationSchema>;
