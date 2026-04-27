import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

type SurfaceProps = ComponentPropsWithoutRef<"section"> & {
  framed?: boolean;
};

export function Surface({ className, framed = false, ...props }: SurfaceProps) {
  return (
    <section
      className={cn(
        "grid gap-4",
        framed &&
          "rounded-ui border border-border bg-surface p-4 text-surface-foreground shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
