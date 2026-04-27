import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

export function Card({ className, ...props }: ComponentPropsWithoutRef<"li">) {
  return (
    <li
      className={cn(
        "grid gap-3 rounded-ui border border-border bg-surface p-4 text-surface-foreground",
        className,
      )}
      {...props}
    />
  );
}
