import { useEffect, useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import api, { formatCents, formatDate } from "@/lib/api";

export default function Balance() {
  const [bal, setBal] = useState(null);
  const [ledger, setLedger] = useState([]);

  useEffect(() => {
    (async () => {
      const [b, l] = await Promise.all([
        api.get("/balance").then(r => r.data),
        api.get("/ledger?limit=100").then(r => r.data),
      ]);
      setBal(b); setLedger(l);
    })();
  }, []);

  return (
    <div data-testid="balance-page">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">Balance</div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Balance & ledger</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="card-base p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-2 flex items-center gap-2">
              <Wallet size={12} /> Available
            </div>
            <div className="font-display text-4xl font-bold tracking-tight">
              {bal ? formatCents(bal.available_cents, bal.currency) : "—"}
            </div>
            <div className="text-xs text-text-muted mt-1 font-mono">USD · payout-ready</div>
          </div>
        </div>
        <div className="card-base p-6">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-2">Pending</div>
          <div className="font-display text-4xl font-bold tracking-tight">
            {bal ? formatCents(bal.pending_cents, bal.currency) : "—"}
          </div>
          <div className="text-xs text-text-muted mt-1 font-mono">Settles T+2</div>
        </div>
        <div className="card-base p-6">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-2">Next payout</div>
          <div className="font-display text-4xl font-bold tracking-tight text-text-muted">—</div>
          <div className="text-xs text-text-muted mt-1 font-mono">Configure in settings</div>
        </div>
      </div>

      <div className="card-base overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted">Ledger</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs font-medium uppercase tracking-[0.2em]">
              <th className="text-left px-5 py-3 font-medium">Type</th>
              <th className="text-left px-5 py-3 font-medium">Description</th>
              <th className="text-right px-5 py-3 font-medium">Amount</th>
              <th className="text-left px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {ledger.length === 0 && (
              <tr><td colSpan={4} className="text-center text-text-muted py-10 text-sm">No ledger entries yet.</td></tr>
            )}
            {ledger.map((l) => (
              <tr key={l.id} className="border-t border-[var(--border)] hover:bg-surface-elevated/50" data-testid={`ledger-row-${l.id}`}>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium uppercase tracking-[0.2em] inline-flex items-center gap-1 ${l.type === "refund" ? "text-amber-400" : "text-emerald-400"}`}>
                    {l.type === "refund" ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />} {l.type}
                  </span>
                </td>
                <td className="px-5 py-3 text-text-secondary">{l.description || "—"}</td>
                <td className={`px-5 py-3 text-right font-mono font-medium ${l.amount < 0 ? "text-red-400" : "text-emerald-400"}`}>{formatCents(l.amount, l.currency)}</td>
                <td className="px-5 py-3 text-text-muted font-mono text-xs">{formatDate(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
