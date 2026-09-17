export const DOSE_UNITS = ["l_ha", "ml_ha", "cc_ha", "kg_ha", "g_ha"] as const;
export type DoseUnit = (typeof DOSE_UNITS)[number];

export const DOSE_UNIT_LABELS: Record<DoseUnit, string> = {
  l_ha: "L/ha",
  ml_ha: "ml/ha",
  cc_ha: "cc/ha",
  kg_ha: "kg/ha",
  g_ha: "g/ha",
};

export const APPLICATION_METHODS = ["ground", "aerial"] as const;
export type ApplicationMethod = (typeof APPLICATION_METHODS)[number];

export const APPLICATION_METHOD_LABELS: Record<ApplicationMethod, string> = {
  ground: "Terrestre",
  aerial: "Aérea",
};

export const WORK_ORDER_STATUSES = [
  "draft",
  "pending",
  "in_progress",
  "pending_review",
  "completed",
  "cancelled",
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  in_progress: "En ejecución",
  pending_review: "Para revisar",
  completed: "Finalizada",
  cancelled: "Cancelada",
};

/** Statuses this phase actually produces; the rest exist for Phase 4/5. */
export const ACTIVE_PHASE_STATUSES: WorkOrderStatus[] = ["draft", "pending", "cancelled"];

export function formatOrderNumber(orderNumber: number | string): string {
  return `OT-${String(orderNumber).padStart(6, "0")}`;
}
