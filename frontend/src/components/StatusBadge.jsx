export default function StatusBadge({ status }) {
  const map = {
    succeeded: { label: "Succeeded", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    failed: { label: "Failed", cls: "bg-red-500/10 text-red-400 border-red-500/30" },
    refunded: { label: "Refunded", cls: "bg-zinc-500/10 text-zinc-300 border-zinc-500/30" },
    partially_refunded: { label: "Partial refund", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    requires_payment_method: { label: "Requires payment", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    requires_confirmation: { label: "Awaiting confirm", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    processing: { label: "Processing", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    canceled: { label: "Canceled", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" },
    pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    open: { label: "Open", cls: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
    complete: { label: "Complete", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    delivered_simulated: { label: "Delivered", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
  };
  const v = map[status] || { label: status, cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30" };
  return (
    <span
      data-testid={`status-badge-${status}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs rounded-full border font-medium ${v.cls}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {v.label}
    </span>
  );
}
