type BeltStatusBadgeProps = {
  status: string;
};

export function BeltStatusBadge({ status }: BeltStatusBadgeProps) {
  return <span className={`belt-status belt-status--${status}`}>{status}</span>;
}
