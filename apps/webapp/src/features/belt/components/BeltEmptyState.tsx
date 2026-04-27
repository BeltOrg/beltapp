type BeltEmptyStateProps = {
  title: string;
  action?: {
    label: string;
    href: string;
    onNavigate: (nextPath: string) => void;
  };
};

export function BeltEmptyState({ title, action }: BeltEmptyStateProps) {
  return (
    <section className="belt-empty">
      <p>{title}</p>
      {action ? (
        <a
          href={action.href}
          className="belt-button belt-button--primary"
          onClick={(event) => {
            event.preventDefault();
            action.onNavigate(action.href);
          }}
        >
          {action.label}
        </a>
      ) : null}
    </section>
  );
}
