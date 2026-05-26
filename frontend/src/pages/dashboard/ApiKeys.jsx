import { useEffect, useState } from "react";
import { Eye, EyeOff, Copy, RotateCw, KeyRound, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import api, { formatDate } from "@/lib/api";

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const load = async () => {
    const { data } = await api.get("/api-keys");
    setKeys(data);
  };
  useEffect(() => { load(); }, []);

  const copy = (key, val) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 1200);
    toast.success("Copied to clipboard");
  };

  const rotate = async () => {
    if (!window.confirm("Rotate keys? Current keys will be revoked immediately.")) return;
    setBusy(true);
    try {
      await api.post("/api-keys/rotate");
      toast.success("New keys issued");
      await load();
    } catch (e) {
      toast.error("Rotation failed");
    } finally { setBusy(false); }
  };

  const active = keys.filter((k) => !k.revoked);
  const revoked = keys.filter((k) => k.revoked);

  return (
    <div data-testid="api-keys-page" className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">// developers</div>
          <h1 className="font-display text-4xl font-bold tracking-tight">API keys</h1>
        </div>
        <button onClick={rotate} disabled={busy} className="btn-secondary text-sm" data-testid="rotate-keys-btn">
          <RotateCw size={14} /> {busy ? "Rotating…" : "Rotate keys"}
        </button>
      </div>

      <div className="card-base p-4 mb-6 flex items-start gap-3 border-amber-500/30 bg-amber-500/5">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-medium text-amber-300">Treat your secret key like a password.</div>
          <div className="text-text-secondary mt-1">Anyone with your secret key can charge cards on your account. Never commit it to a public repo or expose it on the client side.</div>
        </div>
      </div>

      {active.map((k) => (
        <div key={k.id} className="card-base mb-4" data-testid={`api-key-active-${k.id}`}>
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound size={14} className="text-volt" />
              <span className="font-mono text-xs uppercase tracking-widest text-text-muted">
                {k.mode || "test"} keys
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest rounded-full border border-volt/30 bg-volt/10 text-volt">Active</span>
            </div>
            <div className="text-xs text-text-muted font-mono">Created {formatDate(k.created_at)}</div>
          </div>

          <KeyRow
            label="Publishable key"
            value={k.publishable_key}
            isSecret={false}
            onCopy={() => copy(`pk-${k.id}`, k.publishable_key)}
            copied={copiedKey === `pk-${k.id}`}
          />
          <KeyRow
            label="Secret key"
            value={k.secret_key}
            isSecret
            revealed={!!revealed[k.id]}
            onToggle={() => setRevealed((p) => ({ ...p, [k.id]: !p[k.id] }))}
            onCopy={() => copy(`sk-${k.id}`, k.secret_key)}
            copied={copiedKey === `sk-${k.id}`}
          />
        </div>
      ))}

      {revoked.length > 0 && (
        <div className="mt-8">
          <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-3">Revoked</div>
          <div className="space-y-2">
            {revoked.map((k) => (
              <div key={k.id} className="card-base p-4 opacity-60 flex items-center justify-between" data-testid={`api-key-revoked-${k.id}`}>
                <div className="font-mono text-sm text-text-muted">{k.publishable_key}</div>
                <div className="text-xs text-text-muted font-mono">Revoked {formatDate(k.revoked_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KeyRow({ label, value, isSecret, revealed, onToggle, onCopy, copied }) {
  const masked = isSecret && !revealed ? value.slice(0, 8) + "•".repeat(Math.max(0, value.length - 8)) : value;
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-3 border-b border-[var(--border)] last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">{label}</div>
        <div className="font-mono text-sm truncate select-all" data-testid={`key-value-${label.toLowerCase().replace(/\s+/g, '-')}`}>{masked}</div>
      </div>
      <div className="flex items-center gap-1.5">
        {isSecret && (
          <button onClick={onToggle} className="btn-ghost p-2" data-testid={`toggle-reveal-${label.toLowerCase().replace(/\s+/g, '-')}`}>
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
        <button onClick={onCopy} className="btn-ghost p-2" data-testid={`copy-${label.toLowerCase().replace(/\s+/g, '-')}`}>
          {copied ? <Check size={14} className="text-volt" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
