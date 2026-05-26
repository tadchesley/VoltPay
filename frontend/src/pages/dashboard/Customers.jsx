import { useEffect, useState } from "react";
import { Plus, Mail, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatDate } from "@/lib/api";

export default function Customers() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", description: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await api.get("/customers?limit=200");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/customers", form);
      toast.success("Customer created");
      setForm({ email: "", name: "", description: "" });
      setOpen(false);
      await load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to create customer");
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete customer?")) return;
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Customer deleted");
      setItems((p) => p.filter((c) => c.id !== id));
    } catch (e) {
      toast.error("Delete failed");
    }
  };

  return (
    <div data-testid="customers-page">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">// customers</div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Customers</h1>
        </div>
        <button onClick={() => setOpen(true)} className="btn-volt text-sm" data-testid="new-customer-btn">
          <Plus size={14} /> New customer
        </button>
      </div>

      <div className="card-base overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted font-mono text-xs uppercase tracking-widest">
              <th className="text-left px-5 py-3 font-medium">Email</th>
              <th className="text-left px-5 py-3 font-medium">Name</th>
              <th className="text-left px-5 py-3 font-medium">Description</th>
              <th className="text-left px-5 py-3 font-medium">Created</th>
              <th className="text-right px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={5} className="text-center text-text-muted py-12 text-sm">No customers yet.</td></tr>
            )}
            {items.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)] hover:bg-surface-elevated/50" data-testid={`customer-row-${c.id}`}>
                <td className="px-5 py-3 font-mono text-sm">{c.email || "—"}</td>
                <td className="px-5 py-3">{c.name || "—"}</td>
                <td className="px-5 py-3 text-text-secondary truncate max-w-[300px]">{c.description || "—"}</td>
                <td className="px-5 py-3 text-text-secondary font-mono text-xs">{formatDate(c.created_at)}</td>
                <td className="px-5 py-3 text-right">
                  <button onClick={() => remove(c.id)} className="text-text-muted hover:text-red-400 p-1" data-testid={`delete-customer-${c.id}`}>
                    <Trash2 size={14} />
                  </button>
                </td>
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
            data-testid="new-customer-form"
          >
            <div className="flex items-center gap-2 mb-5">
              <UserPlus size={18} className="text-volt" />
              <h2 className="font-display text-xl font-bold">New customer</h2>
            </div>

            <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Email</label>
            <input
              type="email" required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 bg-surface-elevated border border-[var(--border)] rounded-md text-sm font-mono focus:outline-none focus:border-volt mb-3"
              data-testid="new-customer-email"
            />

            <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-surface-elevated border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-volt mb-3"
              data-testid="new-customer-name"
            />

            <label className="block text-xs font-mono uppercase tracking-widest text-text-muted mb-1.5">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-surface-elevated border border-[var(--border)] rounded-md text-sm focus:outline-none focus:border-volt mb-5"
              data-testid="new-customer-description"
            />

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-sm">Cancel</button>
              <button type="submit" disabled={busy} className="btn-volt text-sm" data-testid="submit-new-customer">{busy ? "Creating…" : "Create"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
