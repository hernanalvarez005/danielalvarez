import { z } from "zod";

export const PRODUCT_UNITS = ["l", "ml", "kg", "g", "cc"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  l: "Litros (l)",
  ml: "Mililitros (ml)",
  kg: "Kilogramos (kg)",
  g: "Gramos (g)",
  cc: "Centímetros cúbicos (cc)",
};

const emailRule = z
  .string()
  .nullable()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email inválido");

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  legalName: z.string().nullable(),
  taxId: z.string().nullable(),
  phone: z.string().nullable(),
  email: emailRule,
  notes: z.string().nullable(),
});
export type CustomerInput = z.infer<typeof customerInputSchema>;

export const fieldInputSchema = z.object({
  customerId: z.uuid("Seleccioná un cliente"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  locality: z.string().nullable(),
  province: z.string().nullable(),
  notes: z.string().nullable(),
});
export type FieldInput = z.infer<typeof fieldInputSchema>;

export const plotInputSchema = z.object({
  fieldId: z.uuid("Campo inválido"),
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  areaHa: z
    .string()
    .nullable()
    .transform((val, ctx) => {
      if (val === null) return null;
      const n = Number(val);
      if (Number.isNaN(n) || n < 0) {
        ctx.addIssue({ code: "custom", message: "La superficie tiene que ser un número mayor o igual a 0" });
        return z.NEVER;
      }
      return n;
    }),
  notes: z.string().nullable(),
});
export type PlotInput = z.infer<typeof plotInputSchema>;

export const campaignInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
});
export type CampaignInput = z.infer<typeof campaignInputSchema>;

export const cropInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
});
export type CropInput = z.infer<typeof cropInputSchema>;

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  defaultUnit: z.enum(PRODUCT_UNITS, { message: "Elegí una unidad válida" }),
  notes: z.string().nullable(),
});
export type ProductInput = z.infer<typeof productInputSchema>;

export const applicatorInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio"),
  phone: z.string().nullable(),
});
export type ApplicatorInput = z.infer<typeof applicatorInputSchema>;
