"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function ActiveToggleButton({
  active,
  onToggle,
  size = "sm",
}: {
  active: boolean;
  onToggle: () => Promise<void>;
  size?: "sm" | "default";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      disabled={pending}
      onClick={() => startTransition(onToggle)}
    >
      {active ? "Desactivar" : "Activar"}
    </Button>
  );
}
