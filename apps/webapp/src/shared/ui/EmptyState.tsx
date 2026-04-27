import { Link } from "react-router";
import { Button } from "./Button";

type EmptyStateProps = {
  title: string;
  action?: {
    label: string;
    href: string;
  };
};

export function EmptyState({ title, action }: EmptyStateProps) {
  return (
    <section className="flex items-center justify-between gap-3 rounded-ui border border-dashed border-border bg-muted p-3">
      <p className="m-0 text-sm text-muted-foreground">{title}</p>
      {action ? (
        <Button asChild variant="primary">
          <Link to={action.href}>{action.label}</Link>
        </Button>
      ) : null}
    </section>
  );
}
