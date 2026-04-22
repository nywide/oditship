import { cn } from "@/lib/utils";
import { statusColor, statusLabel } from "@/lib/orderStatus";

export const StatusBadge = ({ status }: { status: string }) => {
  const c = statusColor(status);
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap", c.bg, c.text, c.ring)}>
      {statusLabel(status)}
    </span>
  );
};
