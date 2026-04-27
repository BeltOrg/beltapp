import { Slot } from "@radix-ui/react-slot";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  asChild?: boolean;
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border-border bg-surface text-foreground hover:border-ring hover:bg-muted",
  ghost: "border-transparent bg-transparent text-foreground hover:bg-muted",
};

export function Button({
  asChild = false,
  className,
  variant = "secondary",
  type = "button",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  return (
    <Component
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-ui border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-55",
        variants[variant],
        className,
      )}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
