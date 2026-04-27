import { Badge } from "../../../shared/ui";

type BeltStatusBadgeProps = {
  status: string;
};

export function BeltStatusBadge({ status }: BeltStatusBadgeProps) {
  const variant = status.toLowerCase() as
    | "created"
    | "accepted"
    | "started"
    | "finished"
    | "paid"
    | "cancelled";

  return <Badge variant={variant}>{status}</Badge>;
}
