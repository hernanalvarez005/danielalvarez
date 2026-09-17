import { cn } from "@/lib/utils";

/**
 * Text-based brand lockup. Swap for the real logo (Image) once it's
 * provided — every place that renders <Brand /> keeps working without it.
 */
export function Brand({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) {
  return (
    <div className={cn("flex flex-col leading-none", className)}>
      <span className={cn("font-semibold tracking-tight", size === "lg" ? "text-2xl" : "text-sm")}>
        DANIEL ALVAREZ
      </span>
      <span
        className={cn(
          "font-medium tracking-wide uppercase opacity-70",
          size === "lg" ? "mt-1.5 text-xs" : "text-[10px]",
        )}
      >
        Servicios Agropecuarios
      </span>
    </div>
  );
}
