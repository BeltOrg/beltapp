import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

type BadgeVariant =
  | "neutral"
  | "created"
  | "accepted"
  | "started"
  | "finished"
  | "paid"
  | "cancelled";

type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-muted text-muted-foreground",
  created: "bg-warning text-warning-foreground",
  accepted: "bg-success text-success-foreground",
  started: "bg-success text-success-foreground",
  finished: "bg-info text-info-foreground",
  paid: "bg-info text-info-foreground",
  cancelled: "bg-danger text-danger-foreground",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
