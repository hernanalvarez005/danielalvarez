export { LOAD_PRODUCT_UNITS, LOAD_PRODUCT_UNIT_LABELS, type LoadProductUnit } from "./calculations";

export function formatLoadNumber(loadNumber: number): string {
  return `Carga ${loadNumber}`;
}
