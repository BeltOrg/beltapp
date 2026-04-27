import { EmptyState } from "../../../shared/ui";

type BeltEmptyStateProps = {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
};

export function BeltEmptyState({
  action,
  description,
  title,
}: BeltEmptyStateProps) {
  return <EmptyState action={action} description={description} title={title} />;
}
