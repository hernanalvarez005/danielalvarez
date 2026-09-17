import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Compact lockup (mark + wordmark) for the sidebar/topbar/drawer, where
 * the full circular logo would be too small to read on its own.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.jpeg"
        alt="Daniel Alvarez Servicios Agropecuarios"
        width={72}
        height={72}
        priority
        className="size-9 shrink-0 rounded-full object-cover"
      />
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">DANIEL ALVAREZ</span>
        <span className="text-[10px] font-medium tracking-wide uppercase opacity-70">
          Servicios Agropecuarios
        </span>
      </div>
    </div>
  );
}

/** Full circular logo, for institutional spots like the login screen. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.jpeg"
      alt="Daniel Alvarez Servicios Agropecuarios — Pulverizaciones, Siembras y Cosechas"
      width={480}
      height={480}
      priority
      className={cn("size-28 rounded-full object-cover shadow-sm", className)}
    />
  );
}
