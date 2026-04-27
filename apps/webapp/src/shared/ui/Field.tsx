import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "./cn";

type FieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

const controlClassName =
  "w-full rounded-ui border border-border bg-surface px-3 py-2 text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30";

export function Field({ children, className, label }: FieldProps) {
  return (
    <label className={cn("grid gap-1.5 text-sm font-semibold", className)}>
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return <input className={cn(controlClassName, className)} {...props} />;
}

export function SelectInput({
  className,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return <select className={cn(controlClassName, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return <textarea className={cn(controlClassName, className)} {...props} />;
}
