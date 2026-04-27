import { Link } from "react-router";
import { Button } from "./Button";
import { cn } from "./cn";

type StateAction = {
  label: string;
  href: string;
};

type PendingStateProps = {
  className?: string;
  description?: string;
  title?: string;
};

type ErrorStateProps = {
  action?: StateAction;
  className?: string;
  eyebrow?: string;
  message: string;
  title?: string;
};

export function PendingState({
  className,
  description,
  title = "Loading",
}: PendingStateProps) {
  return (
    <section
      className={cn(
        "grid gap-3 rounded-ui border border-border bg-surface p-4 text-surface-foreground shadow-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span
          className="block size-3 rounded-full bg-primary motion-safe:animate-pulse"
          aria-hidden="true"
        />
        <p className="m-0 text-sm font-semibold">{title}</p>
      </div>
      {description ? (
        <p className="m-0 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </section>
  );
}

export function ErrorState({
  action,
  className,
  eyebrow = "Error",
  message,
  title = "Something went wrong.",
}: ErrorStateProps) {
  return (
    <section
      className={cn(
        "grid gap-3 rounded-ui border border-danger/40 bg-danger/10 p-4 text-danger-foreground",
        className,
      )}
      role="alert"
    >
      <p className="m-0 text-xs font-bold uppercase">{eyebrow}</p>
      <h2 className="m-0 text-2xl font-semibold">{title}</h2>
      <p className="m-0 max-w-prose text-sm">{message}</p>
      {action ? (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={action.href}>{action.label}</Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
