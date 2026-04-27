import { EmptyState } from "../../../shared/ui";

type BeltEmptyStateProps = {
  title: string;
  action?: {
    label: string;
    href: string;
    onNavigate?: (nextPath: string) => void;
  };
};

export function BeltEmptyState({ title, action }: BeltEmptyStateProps) {
  return <EmptyState action={action} title={title} />;
}
