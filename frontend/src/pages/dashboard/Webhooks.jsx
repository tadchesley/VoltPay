import { useEffect, useState } from "react";
import { Plus, Trash2, Webhook as WebhookIcon, Activity } from "lucide-react";
import { toast } from "sonner";
import api, { formatDate, shortenId } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

const EVENT_TYPES = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.succeeded",
  "charge.failed",
  "charge.refunded",
];

export default function Webhooks() {
  const [endpoints, setEndpoints] = useState([]);
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ url: "", events: ["payment_intent.succeeded"], description: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [e, ev] = await Promise.all([
      api.get("/webhook_endpoints").then(r => r.data),
      api.get("/webhook_events?limit=50").then(r => r.data),
    ]);
    setEndpoints(e); setEvents(ev);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/webhook_endpoints", form);
      toast.success("Endpoint added");
      setForm({ url: "", events: ["payment_intent.succeeded"], description: "" });
      setOpen(false);
      await load();
    } catch (e) {
      toast.error("Failed to add endpoint");
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this webhook endpoint?")) return;
    await api.delete(`/webhook_endpoints/${id}`);
    toast.success("Deleted");
    await load();
  };

  const toggleEvent = (ev) => {
    setForm((p) => ({
      ...p,
      events: p.events.includes(ev) ? p.events.filter(e => e !== ev) : [...p.events, ev],
    }));
  };

  return (
    <div data-testid="webhooks-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-text-muted mb-1">Webhooks</div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Webhooks</h1>
        </div>
        <button onClick={() => setOpen(true)} className="btn-volt text-sm" data-testid="add-webhook-btn">
          <Plus size={14} /> Add endpoint
        </button>
      </div>

      <div className="card-base mb-8">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
          <WebhookIcon size={14} className="text-volt" />
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted">Endpoints</div>
        </div>
        {endpoints.length === 0 && (
          <div className="text-center text-text-muted py-12 text-sm">No webhook endpoints yet.</div>
        )}
        {endpoints.map((e) => (
          <div key={e.id} className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between gap-4" data-testid={`webhook-endpoint-${e.id}`}>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-sm truncate">{e.url}</div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {e.events?.map((ev) => (
                  <span key={ev} className="font-mono text-[10px] uppercase tracking-widest text-volt bg-volt/10 border border-volt/30 px-2 py-0.5 rounded-full">{ev}</span>
                ))}
              </div>
              <div className="font-mono text-xs text-text-muted mt-2">
                Signing secret: <span className="select-all">{e.secret}</span>
              </div>
            </div>
            <button onClick={() => remove(e.id)} className="text-text-muted hover:text-red-400 p-2" data-testid={`delete-webhook-${e.id}`}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="card-base overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
          <Activity size={14} className="text-volt" />
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted">Recent events</div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs font-medium uppercase tracking-[0.2em]">
              <th className="text-left px-5 py-3 font-medium">Event</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Resource</th>
              <th className="text-left px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr><td colSpan={4} className="text-center text-text-muted py-10 text-sm">No events yet.</td></tr>
            )}
            {events.map((ev) => (
              <tr key={ev.id} className="border-t border-[var(--border)]" data-testid={`event-row-${ev.id}`}>
                <td className="px-5 py-3 font-mono text-xs">{ev.event_type}</td>
                <td className="px-5 py-3"><StatusBadge status={ev.status} /></td>
                <td className="px-5 py-3 font-mono text-xs text-text-muted">{shortenId(ev.data?.id)}</td>
                <td className="px-5 py-3 text-text-muted font-mono text-xs">{formatDate(ev.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setOpen(false)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={create}
            className="card-base p-6 w-full max-w-md"
            data-testid="webhook-form"
          >
            <h2 className="font-display text-xl font-bold mb-4">Add endpoint</h2>
            <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Endpoint URL</label>
            <input
              required
              type="url"
              placeholder="https://example.com/voltpay/webhook"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full px-3 py-2 bg-surface-elevated border border-[var(--border)] rounded-md text-sm font-mono focus:outline-none focus:border-volt mb-3"
              data-testid="webhook-url-input"
            />
            <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Events</label>
            <div className="space-y-1 mb-4">
              {EVENT_TYPES.map((ev) => (
                <label key={ev} className="flex items-center gap-2 text-sm font-mono cursor-pointer">
                  <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} data-testid={`event-checkbox-${ev}`} />
                  <span>{ev}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
              <button type="submit" disabled={busy} className="btn-volt text-sm" data-testid="submit-webhook">{busy ? "Adding…" : "Add"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
