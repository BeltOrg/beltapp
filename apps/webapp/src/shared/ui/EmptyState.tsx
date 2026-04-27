import { Link } from "react-router";
import { Button } from "./Button";
import { cn } from "./cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  className?: string;
};

export function EmptyState({
  action,
  className,
  description,
  title,
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "grid gap-3 rounded-ui border border-dashed border-border bg-muted p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        className,
      )}
    >
      <div className="grid gap-1">
        <p className="m-0 text-sm font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="m-0 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Button asChild variant="primary">
          <Link to={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </section>
  );
}
