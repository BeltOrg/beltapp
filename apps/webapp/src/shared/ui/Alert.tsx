import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

type AlertTone = "danger" | "info";

type AlertProps = ComponentPropsWithoutRef<"div"> & {
  tone?: AlertTone;
};

const tones: Record<AlertTone, string> = {
  danger: "border-danger/40 bg-danger/10 text-danger-foreground",
  info: "border-info bg-info text-info-foreground",
};

export function Alert({
  className,
  role = "alert",
  tone = "danger",
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-ui border px-3 py-2 text-sm",
        tones[tone],
        className,
      )}
      role={role}
      {...props}
    />
  );
}
