import { useAuth } from "@/contexts/AuthContext";

export default function Settings() {
  const { user } = useAuth();
  return (
    <div data-testid="settings-page" className="max-w-3xl">
      <div className="mb-8">
        <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-1">// settings</div>
        <h1 className="font-display text-4xl font-bold tracking-tight">Account</h1>
      </div>

      <div className="card-base p-6 mb-4">
        <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-4">Business profile</div>
        <Row label="Business name" value={user?.business_name || "—"} />
        <Row label="Email" value={user?.email} mono />
        <Row label="Country" value={user?.country} mono />
        <Row label="Account ID" value={user?.id} mono />
        <Row label="Verified" value={user?.verified ? "Yes" : "Pending review"} />
      </div>

      <div className="card-base p-6 mb-4">
        <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-4">Payout preferences</div>
        <Row label="Schedule" value="Daily (T+2)" />
        <Row label="Bank account" value="Not connected — sandbox" mono />
        <Row label="Minimum payout" value="$5.00" mono />
      </div>

      <div className="card-base p-6">
        <div className="font-mono text-xs uppercase tracking-widest text-text-muted mb-4">Compliance</div>
        <Row label="KYC status" value="Sandbox auto-approved" />
        <Row label="Risk score" value="Low" />
        <Row label="Audit log" value="Enabled" />
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-b-0">
      <div className="text-text-secondary text-sm">{label}</div>
      <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
