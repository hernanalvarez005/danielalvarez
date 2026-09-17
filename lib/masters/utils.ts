import type { ZodError } from "zod";

/** Trims a FormData value and turns blank input into `null` for optional DB columns. */
export function emptyToNull(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? "").trim();
  return s.length > 0 ? s : null;
}

export function requiredText(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

/** First error message per field, for simple inline form error display. */
export function flattenZodError(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
