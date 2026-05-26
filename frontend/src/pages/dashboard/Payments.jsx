import { useEffect, useState } from "react";
import { Search, Filter, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import api, { formatCents, formatDate, shortenId } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function Payments() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refunding, setRefunding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get("/charges?limit=200");
    setCharges(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = charges.filter((c) => {
    if (filter !== "all" && c.status !== filter) return false;
    if (q && !(c.description || "").toLowerCase().includes(q.toLowerCase()) &&
        !(c.card_last4 || "").includes(q) &&
        !(c.id || "").includes(q)) return false;
    return true;
  });

  const refund = async () => {
    if (!selected) return;
    setRefunding(true);
    try {
      const cents = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : undefined;
      await api.post("/refunds", { charge_id: selected.id, amount: cents });
      toast.success("Refund issued");
      setSelected(null);
      setRefundAmount("");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Refund failed");
    } finally { setRefunding(false); }
  };

  return (
    <div data-testid="payments-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">Payments</div>
          <h1 className="font-display text-4xl font-bold tracking-tight">All payments</h1>
        </div>
        <button onClick={load} className="btn-secondary text-sm" data-testid="refresh-payments-btn">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="card-base overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              data-testid="payments-search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by id, last4, or description"
              className="w-full pl-9 pr-3 py-2 bg-surface-elevated border border-[var(--border)] rounded-md text-sm font-mono focus:outline-none focus:border-volt"
            />
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {["all", "succeeded", "failed", "refunded", "partially_refunded"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                data-testid={`filter-${s}`}
                className={`px-3 py-1.5 rounded-md border transition-colors ${
                  filter === s ? "bg-volt/10 border-volt/40 text-volt" : "bg-surface-elevated border-[var(--border)] text-text-secondary hover:text-text-primary"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs font-medium uppercase tracking-[0.2em]">
              <th className="text-left px-5 py-3 font-medium">Amount</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Card</th>
              <th className="text-left px-5 py-3 font-medium">ID</th>
              <th className="text-left px-5 py-3 font-medium">Description</th>
              <th className="text-left px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="text-center text-text-muted py-12 text-sm">Loading…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-text-muted py-12 text-sm">No payments match the filters.</td></tr>
            )}
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => setSelected(c)}
                className="border-t border-[var(--border)] hover:bg-surface-elevated/50 cursor-pointer"
                data-testid={`payment-row-${c.id}`}
              >
                <td className="px-5 py-3 font-medium">{formatCents(c.amount, c.currency)}</td>
                <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-3 font-mono text-xs text-text-secondary uppercase">{c.card_brand} •••• {c.card_last4}</td>
                <td className="px-5 py-3 font-mono text-xs text-text-muted">{shortenId(c.id)}</td>
                <td className="px-5 py-3 text-text-secondary truncate max-w-[280px]">{c.description || "—"}</td>
                <td className="px-5 py-3 text-text-secondary font-mono text-xs">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" data-testid="payment-drawer">
          <div className="flex-1 bg-black/60" onClick={() => setSelected(null)} />
          <div className="w-full max-w-md bg-[var(--bg)] border-l border-[var(--border)] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="font-mono text-xs text-text-muted uppercase tracking-[0.2em]">Payment</div>
                <div className="font-mono text-sm text-text-secondary">{selected.id}</div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost p-2" data-testid="close-drawer-btn">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-text-muted text-xs font-medium uppercase tracking-[0.2em] mb-1">Amount</div>
                <div className="font-display text-3xl font-bold">{formatCents(selected.amount, selected.currency)}</div>
                <div className="mt-1.5"><StatusBadge status={selected.status} /></div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <Detail label="Amount received" value={formatCents(selected.net || selected.amount, selected.currency)} />
                <Detail label="Refunded" value={formatCents(selected.amount_refunded || 0)} />
                <Detail label="Card" value={`${(selected.card_brand || "").toUpperCase()} •••• ${selected.card_last4}`} mono />
                <Detail label="Exp" value={`${selected.card_exp_month}/${selected.card_exp_year}`} mono />
                <Detail label="Auth code" value={selected.authorization_code || "—"} mono />
                <Detail label="Currency" value={(selected.currency || "usd").toUpperCase()} mono />
              </div>

              {selected.failure_message && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2 text-sm text-red-400">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] mb-0.5">{selected.failure_code}</div>
                  {selected.failure_message}
                </div>
              )}

              <Detail label="Description" value={selected.description || "—"} />
              <Detail label="Receipt email" value={selected.receipt_email || "—"} mono />
              <Detail label="Created" value={formatDate(selected.created_at)} mono />
              <Detail label="Payment intent" value={shortenId(selected.payment_intent_id)} mono />

              {(selected.status === "succeeded" || selected.status === "partially_refunded") && (
                <div className="card-base p-4">
                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-2">Issue refund</div>
                  <div className="text-xs text-text-secondary mb-3">
                    Available: {formatCents(selected.amount - (selected.amount_refunded || 0))}
                  </div>
                  <input
                    data-testid="refund-amount-input"
                    type="number"
                    step="0.01"
                    placeholder="Full amount"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-[var(--border)] rounded-md text-sm font-mono focus:outline-none focus:border-volt mb-3"
                  />
                  <button onClick={refund} disabled={refunding} className="btn-volt w-full text-sm" data-testid="issue-refund-btn">
                    {refunding ? "Refunding…" : "Issue refund"}
                  </button>
                </div>
              )}

              <details className="card-base p-4">
                <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.2em] text-text-muted">View technical details</summary>
                <pre className="mt-3 text-xs font-mono text-text-secondary overflow-x-auto">{JSON.stringify(selected, null, 2)}</pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div>
      <div className="text-text-muted text-xs font-medium uppercase tracking-[0.2em] mb-0.5">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
