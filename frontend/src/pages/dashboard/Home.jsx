import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowUpRight, CheckCircle2, Users as UsersIcon } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import api, { formatCents, formatDate, shortenId } from "@/lib/api";
import StatusBadge from "@/components/StatusBadge";

export default function Home() {
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, r, c] = await Promise.all([
        api.get("/stats/overview").then(r => r.data).catch(() => null),
        api.get("/stats/revenue_series?days=14").then(r => r.data).catch(() => []),
        api.get("/charges?limit=8").then(r => r.data).catch(() => []),
      ]);
      setStats(s);
      setSeries(r.map(p => ({ date: p.date.slice(5), amount: p.amount_cents / 100 })));
      setRecent(c);
    })();
  }, []);

  return (
    <div data-testid="dashboard-home">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-1">Overview</div>
          <h1 className="font-display text-4xl font-bold tracking-tight">Today.</h1>
        </div>
        <Link to="/dashboard/payments" className="btn-secondary text-sm" data-testid="view-all-payments-btn">
          All payments <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* North star */}
      <div className="grid lg:grid-cols-[1.4fr,1fr] gap-6 mb-6">
        <div className="card-base p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
          <div className="relative">
            <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted mb-2">Gross volume · all time</div>
            <div className="font-display text-6xl font-bold tracking-tight">
              {stats ? formatCents(stats.gross_volume_cents) : "$0.00"}
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-emerald-400 inline-flex items-center gap-1">
                <TrendingUp size={14} /> {stats?.success_rate ?? 100}% success
              </span>
              <span className="text-text-muted">·</span>
              <span className="text-text-secondary">{stats?.successful_charges ?? 0} successful charges</span>
            </div>
            <div className="mt-8 h-[180px] min-h-[180px] w-full">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={series} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="volt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4FF00" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#D4FF00" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#27272A" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="date" stroke="#52525B" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525B" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ background: "#121212", border: "1px solid #27272A", borderRadius: 8, fontSize: 12 }} formatter={(v) => `$${v.toFixed(2)}`} />
                  <Area type="monotone" dataKey="amount" stroke="#D4FF00" strokeWidth={2} fill="url(#volt)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-rows-3 gap-3">
          <Stat label="Today" value={stats ? formatCents(stats.today_volume_cents) : "$0.00"} sub={`${stats?.today_count ?? 0} payments`} testid="stat-today" />
          <Stat label="Last 7 days" value={stats ? formatCents(stats.week_volume_cents) : "$0.00"} sub="rolling" testid="stat-week" />
          <Stat label="Customers" value={String(stats?.customers_count ?? 0)} sub="total" icon={<UsersIcon size={14} className="text-volt" />} testid="stat-customers" />
        </div>
      </div>

      {/* Recent activity */}
      <div className="card-base overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="font-medium text-xs uppercase tracking-[0.2em] text-text-muted">Recent payments</div>
          <Link to="/dashboard/payments" className="text-xs text-volt hover:underline" data-testid="view-recent-link">View all</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-muted text-xs uppercase tracking-[0.2em]">
              <th className="text-left px-5 py-3 font-medium">Amount</th>
              <th className="text-left px-5 py-3 font-medium">Status</th>
              <th className="text-left px-5 py-3 font-medium">Card</th>
              <th className="text-left px-5 py-3 font-medium">Description</th>
              <th className="text-left px-5 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr><td colSpan={5} className="text-center text-text-muted py-12 text-sm">No payments yet — make your first charge via API or hosted checkout.</td></tr>
            )}
            {recent.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)] hover:bg-surface-elevated/50" data-testid={`recent-row-${c.id}`}>
                <td className="px-5 py-3 font-medium">{formatCents(c.amount, c.currency)}</td>
                <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-3 font-mono text-xs text-text-secondary uppercase">{c.card_brand} •••• {c.card_last4}</td>
                <td className="px-5 py-3 text-text-secondary truncate max-w-[260px]">{c.description || "—"}</td>
                <td className="px-5 py-3 text-text-secondary font-mono text-xs">{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon, testid }) {
  return (
    <div className="card-base p-5 flex flex-col justify-between" data-testid={testid}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-text-muted">{label}</div>
        {icon || <CheckCircle2 size={14} className="text-volt" />}
      </div>
      <div>
        <div className="font-display text-3xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-text-muted mt-1">{sub}</div>
      </div>
    </div>
  );
}
